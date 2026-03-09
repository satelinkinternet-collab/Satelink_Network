// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./EpochAnchor.sol";
import "./RevenueVault.sol";

contract ClaimsWithdrawals is AccessControl, ReentrancyGuard {
    EpochAnchor public immutable epochAnchor;
    RevenueVault public immutable revenueVault;

    uint256 public constant CLAIM_DEADLINE = 48 days;

    struct Claim {
        address operator;
        uint256 totalAmount;
        uint256 withdrawnAmount;
    }

    // claimId -> Claim
    mapping(bytes32 => Claim) public claims;
    // operator -> epochId -> bool
    mapping(address => mapping(uint256 => bool)) public hasClaimedEpoch;
    // user -> total claimable balance
    mapping(address => uint256) public availableBalances;

    event ClaimCreated(bytes32 indexed claimId, address indexed operator, uint256 indexed epochId, uint256 amount);
    event WithdrawExecuted(bytes32 indexed claimId, address indexed operator, uint256 amount);

    error ClaimDeadlinePassed();
    error AlreadyClaimedEpoch();
    error InvalidProof();
    error InvalidAmount();
    error InsufficientLiquidity();

    constructor(address _epochAnchor, address _vault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        epochAnchor = EpochAnchor(_epochAnchor);
        revenueVault = RevenueVault(_vault);
    }

    function claim(uint256 epochId, uint256 amount, bytes32[] calldata merkleProof) external nonReentrant {
        if (hasClaimedEpoch[msg.sender][epochId]) revert AlreadyClaimedEpoch();

        (, bytes32 root,, uint256 anchorTimestamp) = epochAnchor.epochs(epochId);
        require(anchorTimestamp > 0, "Epoch not anchored");

        if (block.timestamp > anchorTimestamp + CLAIM_DEADLINE) revert ClaimDeadlinePassed();

        // Leaf is double hashed according to standard OpenZeppelin MerkleTree library
        // leaf = keccak256(bytes.concat(keccak256(abi.encode(epochId, msg.sender, amount))))
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(epochId, msg.sender, amount))));

        if (!MerkleProof.verify(merkleProof, root, leaf)) revert InvalidProof();

        hasClaimedEpoch[msg.sender][epochId] = true;

        bytes32 claimId = keccak256(abi.encodePacked(msg.sender, epochId, block.timestamp));

        claims[claimId] = Claim({operator: msg.sender, totalAmount: amount, withdrawnAmount: 0});

        availableBalances[msg.sender] += amount;

        emit ClaimCreated(claimId, msg.sender, epochId, amount);
    }

    function withdraw(bytes32 claimId, uint256 amount) external nonReentrant {
        Claim storage c = claims[claimId];
        require(c.operator == msg.sender, "Not claim owner");
        require(amount > 0, "Zero amount");
        require(c.withdrawnAmount + amount <= c.totalAmount, "Exceeds claim balance");

        IERC20 usdt = revenueVault.usdt();
        uint256 vaultBalance = usdt.balanceOf(address(revenueVault));

        if (amount > vaultBalance) revert InsufficientLiquidity();

        c.withdrawnAmount += amount;
        availableBalances[msg.sender] -= amount;

        revenueVault.withdraw(msg.sender, amount);

        emit WithdrawExecuted(claimId, msg.sender, amount);
    }
}
