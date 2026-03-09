// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EligibilityPolicy
 * @notice On-chain eligibility rules for Satelink distribution roles.
 *         Determines who qualifies for revenue shares in each epoch based on
 *         role-specific criteria (uptime, activity, active nodes in region, etc.).
 *
 *         Roles:  NODE_OPERATOR | DISTRIBUTOR | INFLUENCER | OPERATIONS
 *         Each role has a configurable eligibility window (epochs) and minimum
 *         activity thresholds set by governance.
 */
contract EligibilityPolicy is AccessControl {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ─── Role Types ────────────────────────────────────────────────────────────
    enum Role {
        NODE_OPERATOR,
        DISTRIBUTOR,
        INFLUENCER,
        OPERATIONS
    }

    // ─── Policy Configuration ──────────────────────────────────────────────────
    struct RolePolicy {
        uint256 minUptimeBps; // minimum uptime in basis points (e.g. 8000 = 80%)
        uint256 minOpsPerEpoch; // minimum operations per epoch
        uint256 eligibilityWindowEpochs; // how many consecutive epochs must pass criteria
        uint256 claimExpiryDays; // days after epoch to claim (e.g. 48)
        bool active; // is this role currently accepting participants
    }

    mapping(Role => RolePolicy) public policies;

    // ─── Eligibility State ─────────────────────────────────────────────────────
    struct EligibilityRecord {
        uint256 epochId;
        bool eligible;
        uint256 score; // 0-10000 bps quality score
        uint256 checkedAt;
    }

    // address => role => epochId => record
    mapping(address => mapping(Role => mapping(uint256 => EligibilityRecord))) public records;

    // ─── Events ────────────────────────────────────────────────────────────────
    event PolicyUpdated(
        Role indexed role,
        uint256 minUptimeBps,
        uint256 minOpsPerEpoch,
        uint256 windowEpochs,
        uint256 claimExpiryDays,
        bool active
    );
    event EligibilityChecked(
        address indexed account, Role indexed role, uint256 indexed epochId, bool eligible, uint256 score
    );
    event RoleDeactivated(Role indexed role);
    event RoleActivated(Role indexed role);

    // ─── Errors ────────────────────────────────────────────────────────────────
    error PolicyNotActive(Role role);
    error EpochAlreadyChecked(address account, Role role, uint256 epochId);
    error InvalidBps(uint256 value);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);

        // Default policies per the Unified Master Reference
        policies[Role.NODE_OPERATOR] = RolePolicy({
            minUptimeBps: 8000, // 80% minimum uptime
            minOpsPerEpoch: 1, // at least 1 op per epoch
            eligibilityWindowEpochs: 1, // eligible per-epoch
            claimExpiryDays: 48, // 48-day claim window
            active: true
        });

        policies[Role.DISTRIBUTOR] = RolePolicy({
            minUptimeBps: 0,
            minOpsPerEpoch: 0,
            eligibilityWindowEpochs: 1, // weekly eligibility
            claimExpiryDays: 48,
            active: true
        });

        policies[Role.INFLUENCER] = RolePolicy({
            minUptimeBps: 0,
            minOpsPerEpoch: 0,
            eligibilityWindowEpochs: 1, // daily eligibility check
            claimExpiryDays: 48,
            active: true
        });

        policies[Role.OPERATIONS] = RolePolicy({
            minUptimeBps: 0,
            minOpsPerEpoch: 0,
            eligibilityWindowEpochs: 4, // monthly eligibility window
            claimExpiryDays: 48,
            active: true
        });
    }

    // ─── Policy Management ─────────────────────────────────────────────────────

    /**
     * @notice Update eligibility policy for a role. Only POLICY_ADMIN_ROLE.
     */
    function updatePolicy(
        Role role,
        uint256 minUptimeBps,
        uint256 minOpsPerEpoch,
        uint256 eligibilityWindowEpochs,
        uint256 claimExpiryDays,
        bool active
    ) external onlyRole(POLICY_ADMIN_ROLE) {
        if (minUptimeBps > 10000) revert InvalidBps(minUptimeBps);

        policies[role] = RolePolicy({
            minUptimeBps: minUptimeBps,
            minOpsPerEpoch: minOpsPerEpoch,
            eligibilityWindowEpochs: eligibilityWindowEpochs,
            claimExpiryDays: claimExpiryDays,
            active: active
        });

        emit PolicyUpdated(role, minUptimeBps, minOpsPerEpoch, eligibilityWindowEpochs, claimExpiryDays, active);
    }

    /**
     * @notice Deactivate a role entirely. Unallocated shares redirect per reallocation rules.
     */
    function deactivateRole(Role role) external onlyRole(POLICY_ADMIN_ROLE) {
        policies[role].active = false;
        emit RoleDeactivated(role);
    }

    /**
     * @notice Reactivate a role.
     */
    function activateRole(Role role) external onlyRole(POLICY_ADMIN_ROLE) {
        policies[role].active = true;
        emit RoleActivated(role);
    }

    // ─── Eligibility Oracle ────────────────────────────────────────────────────

    /**
     * @notice Record eligibility result for an account/role/epoch. Called by off-chain oracle.
     * @param account  The wallet address being evaluated
     * @param role     The role being evaluated
     * @param epochId  The epoch for which eligibility is determined
     * @param eligible Whether the account meets the role criteria
     * @param score    Quality score in basis points (0-10000)
     */
    function recordEligibility(address account, Role role, uint256 epochId, bool eligible, uint256 score)
        external
        onlyRole(ORACLE_ROLE)
    {
        if (!policies[role].active) revert PolicyNotActive(role);
        if (records[account][role][epochId].checkedAt != 0) {
            revert EpochAlreadyChecked(account, role, epochId);
        }
        if (score > 10000) revert InvalidBps(score);

        records[account][role][epochId] =
            EligibilityRecord({epochId: epochId, eligible: eligible, score: score, checkedAt: block.timestamp});

        emit EligibilityChecked(account, role, epochId, eligible, score);
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    /**
     * @notice Check if an account is eligible for a role in a given epoch.
     */
    function isEligible(address account, Role role, uint256 epochId) external view returns (bool) {
        EligibilityRecord memory rec = records[account][role][epochId];
        return rec.checkedAt != 0 && rec.eligible;
    }

    /**
     * @notice Get the quality score for an account/role/epoch.
     */
    function getScore(address account, Role role, uint256 epochId) external view returns (uint256) {
        return records[account][role][epochId].score;
    }

    /**
     * @notice Get the full policy for a role.
     */
    function getPolicy(Role role) external view returns (RolePolicy memory) {
        return policies[role];
    }

    /**
     * @notice Check if a role is currently active.
     */
    function isRoleActive(Role role) external view returns (bool) {
        return policies[role].active;
    }
}
