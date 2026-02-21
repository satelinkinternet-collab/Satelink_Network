// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RevenueDistributor (FIXED — USDT, not ETH)
 * @notice Satelink 50/30/20 split distributor
 *
 * @dev AUDIT FIX: Previously used msg.value (native ETH) which contradicted
 *      the entire USDT-first economic model.
 *      Now: Uses IERC20 + SafeERC20, matching RevenueVault pattern exactly.
 *
 * Split:
 *   50% → Node Operator Pool
 *   30% → Platform (Core Treasury 70% + Builder Rewards 30%)
 *   20% → Distribution Pool (Distributor/Influencer/Ops)
 */
contract RevenueDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");

    // ─── USDT Token ───────────────────────────────────────────────────────────
    IERC20 public immutable usdt;

    // ─── Split Configuration (basis points, 10000 = 100%) ────────────────────
    uint256 public constant BP_DENOMINATOR = 10_000;

    struct SplitConfig {
        uint256 nodeOperatorBP;    // 5000 = 50%
        uint256 platformBP;        // 3000 = 30%
        uint256 distributionBP;    // 2000 = 20%
        // Platform sub-split
        uint256 coreTreasuryBP;    // 7000 of platform = 21% total
        uint256 builderRewardsBP;  // 3000 of platform = 9% total
    }

    SplitConfig public splitConfig;

    // ─── Destination Addresses ────────────────────────────────────────────────
    address public nodeOperatorPool;
    address public coreTreasury;
    address public builderRewardsPool;
    address public distributionPool;

    // ─── Infra Reserve (10% of managed node revenue) ──────────────────────────
    uint256 public constant INFRA_RESERVE_BP = 1_000; // 10%
    address public infraReserve;

    // ─── Accounting ───────────────────────────────────────────────────────────
    uint256 public totalDistributed;
    uint256 public epochCount;

    struct EpochDistribution {
        uint256 epochId;
        uint256 totalAmount;
        uint256 nodeOperatorShare;
        uint256 platformShare;
        uint256 distributionShare;
        uint256 timestamp;
        bytes32 txHash;
    }

    mapping(uint256 => EpochDistribution) public epochDistributions;

    // ─── Events ───────────────────────────────────────────────────────────────
    event Distributed(
        uint256 indexed epochId,
        uint256 totalAmount,
        uint256 nodeOperatorShare,
        uint256 platformShare,
        uint256 distributionShare,
        uint256 timestamp
    );
    event SplitConfigUpdated(uint256 nodeOperatorBP, uint256 platformBP, uint256 distributionBP);
    event DestinationsUpdated();

    // ─── Errors ───────────────────────────────────────────────────────────────
    error ZeroAmount();
    error SplitMismatch(uint256 total);
    error ZeroAddress();
    error InsufficientBalance(uint256 required, uint256 available);

    constructor(
        address _usdt,
        address _nodeOperatorPool,
        address _coreTreasury,
        address _builderRewardsPool,
        address _distributionPool,
        address _infraReserve,
        address _admin
    ) {
        if (_usdt == address(0)) revert ZeroAddress();
        if (_nodeOperatorPool == address(0)) revert ZeroAddress();
        if (_coreTreasury == address(0)) revert ZeroAddress();

        usdt = IERC20(_usdt);

        nodeOperatorPool   = _nodeOperatorPool;
        coreTreasury       = _coreTreasury;
        builderRewardsPool = _builderRewardsPool;
        distributionPool   = _distributionPool;
        infraReserve       = _infraReserve;

        // Default 50/30/20 split
        splitConfig = SplitConfig({
            nodeOperatorBP:   5_000,
            platformBP:       3_000,
            distributionBP:   2_000,
            coreTreasuryBP:   7_000, // of platform portion
            builderRewardsBP: 3_000  // of platform portion
        });

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _admin);
    }

    // ─── Core Distribution ────────────────────────────────────────────────────

    /**
     * @notice Distribute USDT to all pools according to split config
     * @dev AUDIT FIX: Was using msg.value (ETH). Now pulls USDT from caller.
     *      Caller must have approved this contract for `amount` USDT.
     * @param amount Amount of USDT to distribute (6 decimals)
     * @param epochId The epoch this distribution covers
     * @param isManagedNode If true, 10% infra reserve is taken before split
     */
    function distribute(
        uint256 amount,
        uint256 epochId,
        bool isManagedNode
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 balance = usdt.balanceOf(msg.sender);
        if (balance < amount) revert InsufficientBalance(amount, balance);

        // Pull USDT from caller (settlement engine / vault)
        usdt.safeTransferFrom(msg.sender, address(this), amount);

        uint256 distributable = amount;

        // Apply 10% infra reserve for managed nodes
        if (isManagedNode) {
            uint256 infraAmount = (amount * INFRA_RESERVE_BP) / BP_DENOMINATOR;
            usdt.safeTransfer(infraReserve, infraAmount);
            distributable = amount - infraAmount;
        }

        // Calculate shares
        uint256 nodeOperatorShare  = (distributable * splitConfig.nodeOperatorBP) / BP_DENOMINATOR;
        uint256 platformShare      = (distributable * splitConfig.platformBP) / BP_DENOMINATOR;
        uint256 distributionShare  = distributable - nodeOperatorShare - platformShare; // remainder avoids dust

        // Platform sub-split
        uint256 coreTreasuryShare    = (platformShare * splitConfig.coreTreasuryBP) / BP_DENOMINATOR;
        uint256 builderRewardsShare  = platformShare - coreTreasuryShare;

        // Transfer all shares
        usdt.safeTransfer(nodeOperatorPool,   nodeOperatorShare);
        usdt.safeTransfer(coreTreasury,       coreTreasuryShare);
        usdt.safeTransfer(builderRewardsPool, builderRewardsShare);
        usdt.safeTransfer(distributionPool,   distributionShare);

        // Record epoch distribution
        epochDistributions[epochId] = EpochDistribution({
            epochId:           epochId,
            totalAmount:       amount,
            nodeOperatorShare: nodeOperatorShare,
            platformShare:     platformShare,
            distributionShare: distributionShare,
            timestamp:         block.timestamp,
            txHash:            bytes32(0) // filled by off-chain indexer
        });

        totalDistributed += amount;
        epochCount++;

        emit Distributed(
            epochId,
            amount,
            nodeOperatorShare,
            platformShare,
            distributionShare,
            block.timestamp
        );
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function updateSplitConfig(
        uint256 nodeOperatorBP,
        uint256 platformBP,
        uint256 distributionBP
    ) external onlyRole(ADMIN_ROLE) {
        if (nodeOperatorBP + platformBP + distributionBP != BP_DENOMINATOR) {
            revert SplitMismatch(nodeOperatorBP + platformBP + distributionBP);
        }
        splitConfig.nodeOperatorBP  = nodeOperatorBP;
        splitConfig.platformBP      = platformBP;
        splitConfig.distributionBP  = distributionBP;
        emit SplitConfigUpdated(nodeOperatorBP, platformBP, distributionBP);
    }

    function updateDestinations(
        address _nodeOperatorPool,
        address _coreTreasury,
        address _builderRewardsPool,
        address _distributionPool
    ) external onlyRole(ADMIN_ROLE) {
        if (_nodeOperatorPool == address(0) || _coreTreasury == address(0)) revert ZeroAddress();
        nodeOperatorPool   = _nodeOperatorPool;
        coreTreasury       = _coreTreasury;
        builderRewardsPool = _builderRewardsPool;
        distributionPool   = _distributionPool;
        emit DestinationsUpdated();
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Recovery ─────────────────────────────────────────────────────────────

    /// @notice Recover accidentally sent tokens (not USDT in normal flow)
    function recoverToken(address token, uint256 amount, address to) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }

    /// @notice Reject accidental ETH sends — this contract is USDT only
    receive() external payable {
        revert("RevenueDistributor: ETH not accepted. Use USDT.");
    }
}
