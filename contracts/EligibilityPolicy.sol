// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title EligibilityPolicy
 * @notice On-chain epoch scoring rules enforcement for Satelink DePIN.
 *         Defines minimum thresholds a node must meet to be eligible
 *         for reward distribution in a given epoch.
 */
contract EligibilityPolicy is AccessControl, Pausable, ReentrancyGuard {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE");

    // ── Eligibility Thresholds ──────────────────────────────────────

    /// @notice Minimum ops count a node must complete per epoch
    uint256 public minOpsCount;

    /// @notice Minimum uptime percentage in basis points (e.g. 9500 = 95%)
    uint256 public minUptimeBP;

    /// @notice Minimum score (0-10000 BP) to qualify for rewards
    uint256 public minScoreBP;

    /// @notice Maximum heartbeat drift in seconds before disqualification
    uint256 public maxHeartbeatDriftSec;

    // ── Per-Node Epoch Scores ───────────────────────────────────────

    struct NodeScore {
        uint256 opsCount;
        uint256 uptimeBP;        // basis points (10000 = 100%)
        uint256 scoreBP;         // composite score in basis points
        uint256 heartbeatDrift;  // max drift observed in seconds
        bool    eligible;        // computed eligibility
        uint256 timestamp;       // when score was submitted
    }

    /// @notice epochId => nodeId => NodeScore
    mapping(uint256 => mapping(bytes32 => NodeScore)) public nodeScores;

    /// @notice epochId => list of eligible node IDs
    mapping(uint256 => bytes32[]) public eligibleNodes;

    /// @notice epochId => finalized flag (no more score updates)
    mapping(uint256 => bool) public epochFinalized;

    // ── Events ──────────────────────────────────────────────────────

    event ThresholdsUpdated(uint256 minOpsCount, uint256 minUptimeBP, uint256 minScoreBP, uint256 maxHeartbeatDriftSec);
    event NodeScoreSubmitted(uint256 indexed epochId, bytes32 indexed nodeId, uint256 scoreBP, bool eligible);
    event EpochFinalized(uint256 indexed epochId, uint256 eligibleCount);

    // ── Errors ──────────────────────────────────────────────────────

    error EpochAlreadyFinalized(uint256 epochId);
    error InvalidThresholds();

    // ── Constructor ─────────────────────────────────────────────────

    constructor(
        uint256 _minOpsCount,
        uint256 _minUptimeBP,
        uint256 _minScoreBP,
        uint256 _maxHeartbeatDriftSec
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        minOpsCount = _minOpsCount;
        minUptimeBP = _minUptimeBP;
        minScoreBP = _minScoreBP;
        maxHeartbeatDriftSec = _maxHeartbeatDriftSec;
    }

    // ── Admin Functions ─────────────────────────────────────────────

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Update eligibility thresholds
    function updateThresholds(
        uint256 _minOpsCount,
        uint256 _minUptimeBP,
        uint256 _minScoreBP,
        uint256 _maxHeartbeatDriftSec
    ) external onlyRole(ADMIN_ROLE) {
        if (_minUptimeBP > 10000 || _minScoreBP > 10000) revert InvalidThresholds();

        minOpsCount = _minOpsCount;
        minUptimeBP = _minUptimeBP;
        minScoreBP = _minScoreBP;
        maxHeartbeatDriftSec = _maxHeartbeatDriftSec;

        emit ThresholdsUpdated(_minOpsCount, _minUptimeBP, _minScoreBP, _maxHeartbeatDriftSec);
    }

    // ── Scoring Functions ───────────────────────────────────────────

    /// @notice Submit a node's score for an epoch. Only SCORER_ROLE.
    function submitScore(
        uint256 epochId,
        bytes32 nodeId,
        uint256 opsCount,
        uint256 uptimeBP,
        uint256 scoreBP,
        uint256 heartbeatDrift
    ) external onlyRole(SCORER_ROLE) whenNotPaused {
        if (epochFinalized[epochId]) revert EpochAlreadyFinalized(epochId);

        bool eligible = _checkEligibility(opsCount, uptimeBP, scoreBP, heartbeatDrift);

        nodeScores[epochId][nodeId] = NodeScore({
            opsCount: opsCount,
            uptimeBP: uptimeBP,
            scoreBP: scoreBP,
            heartbeatDrift: heartbeatDrift,
            eligible: eligible,
            timestamp: block.timestamp
        });

        if (eligible) {
            eligibleNodes[epochId].push(nodeId);
        }

        emit NodeScoreSubmitted(epochId, nodeId, scoreBP, eligible);
    }

    /// @notice Batch submit scores for multiple nodes in one epoch
    function submitScoresBatch(
        uint256 epochId,
        bytes32[] calldata nodeIds,
        uint256[] calldata opsCounts,
        uint256[] calldata uptimeBPs,
        uint256[] calldata scoreBPs,
        uint256[] calldata heartbeatDrifts
    ) external onlyRole(SCORER_ROLE) whenNotPaused nonReentrant {
        if (epochFinalized[epochId]) revert EpochAlreadyFinalized(epochId);
        require(
            nodeIds.length == opsCounts.length &&
            nodeIds.length == uptimeBPs.length &&
            nodeIds.length == scoreBPs.length &&
            nodeIds.length == heartbeatDrifts.length,
            "EligibilityPolicy: array length mismatch"
        );

        for (uint256 i = 0; i < nodeIds.length; i++) {
            _writeScore(epochId, nodeIds[i], opsCounts[i], uptimeBPs[i], scoreBPs[i], heartbeatDrifts[i]);
        }
    }

    function _writeScore(
        uint256 epochId,
        bytes32 nodeId,
        uint256 opsCount,
        uint256 uptimeBP,
        uint256 scoreBP,
        uint256 heartbeatDrift
    ) internal {
        bool eligible = _checkEligibility(opsCount, uptimeBP, scoreBP, heartbeatDrift);

        nodeScores[epochId][nodeId] = NodeScore({
            opsCount: opsCount,
            uptimeBP: uptimeBP,
            scoreBP: scoreBP,
            heartbeatDrift: heartbeatDrift,
            eligible: eligible,
            timestamp: block.timestamp
        });

        if (eligible) {
            eligibleNodes[epochId].push(nodeId);
        }

        emit NodeScoreSubmitted(epochId, nodeId, scoreBP, eligible);
    }

    /// @notice Finalize an epoch — no more score updates allowed
    function finalizeEpoch(uint256 epochId) external onlyRole(SCORER_ROLE) whenNotPaused {
        if (epochFinalized[epochId]) revert EpochAlreadyFinalized(epochId);
        epochFinalized[epochId] = true;
        emit EpochFinalized(epochId, eligibleNodes[epochId].length);
    }

    // ── View Functions ──────────────────────────────────────────────

    /// @notice Check if a node is eligible for a given epoch
    function isEligible(uint256 epochId, bytes32 nodeId) external view returns (bool) {
        return nodeScores[epochId][nodeId].eligible;
    }

    /// @notice Get the list of eligible nodes for an epoch
    function getEligibleNodes(uint256 epochId) external view returns (bytes32[] memory) {
        return eligibleNodes[epochId];
    }

    /// @notice Get eligible node count for an epoch
    function getEligibleCount(uint256 epochId) external view returns (uint256) {
        return eligibleNodes[epochId].length;
    }

    // ── Internal ────────────────────────────────────────────────────

    function _checkEligibility(
        uint256 opsCount,
        uint256 uptimeBP,
        uint256 scoreBP,
        uint256 heartbeatDrift
    ) internal view returns (bool) {
        return (
            opsCount >= minOpsCount &&
            uptimeBP >= minUptimeBP &&
            scoreBP >= minScoreBP &&
            heartbeatDrift <= maxHeartbeatDriftSec
        );
    }
}
