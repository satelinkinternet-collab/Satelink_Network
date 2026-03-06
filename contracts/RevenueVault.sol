// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RevenueVault
 * @notice Holds protocol USDT revenue. Role-gated deposits and withdrawals
 *         with emergency pause on withdraw.
 */
contract RevenueVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    IERC20 public usdt;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    /// @notice Per-epoch withdrawal cap (0 = unlimited)
    uint256 public withdrawalCap;

    /// @notice Tracks cumulative withdrawals since last cap reset
    uint256 public withdrawalsSinceReset;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event EmergencyPaused(address indexed triggeredBy);
    event WithdrawalCapUpdated(uint256 newCap);
    event WithdrawalCapReset();

    constructor(address _usdt) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        usdt = IERC20(_usdt);
    }

    // ── Admin Controls ──────────────────────────────────────────────

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Emergency pause — immediately halts all deposits and withdrawals
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    /// @notice Set a withdrawal cap. Set to 0 to disable.
    function setWithdrawalCap(uint256 _cap) external onlyRole(ADMIN_ROLE) {
        withdrawalCap = _cap;
        emit WithdrawalCapUpdated(_cap);
    }

    /// @notice Reset the withdrawal counter (call at epoch boundaries)
    function resetWithdrawalCounter() external onlyRole(ADMIN_ROLE) {
        withdrawalsSinceReset = 0;
        emit WithdrawalCapReset();
    }

    // ── Core Operations ─────────────────────────────────────────────

    /// @notice Deposit USDT into the vault. Restricted to DEPOSITOR_ROLE.
    function deposit(uint256 amount) external onlyRole(DEPOSITOR_ROLE) whenNotPaused {
        require(amount > 0, "RevenueVault: zero deposit");
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw USDT from the vault. Auto-pauses if withdrawal cap is breached.
    function withdraw(address to, uint256 amount) external onlyRole(WITHDRAWER_ROLE) whenNotPaused nonReentrant {
        require(amount > 0, "RevenueVault: zero withdrawal");
        require(to != address(0), "RevenueVault: zero address");

        // Check withdrawal cap — if breached, auto-pause
        if (withdrawalCap > 0) {
            withdrawalsSinceReset += amount;
            if (withdrawalsSinceReset > withdrawalCap) {
                _pause();
                emit EmergencyPaused(msg.sender);
                revert("RevenueVault: withdrawal cap breached, vault paused");
            }
        }

        totalWithdrawn += amount;
        usdt.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    // ── View Helpers ────────────────────────────────────────────────

    /// @notice Returns current vault USDT balance
    function vaultBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /// @notice Returns available balance (deposited minus withdrawn)
    function availableBalance() external view returns (uint256) {
        return totalDeposited - totalWithdrawn;
    }
}
