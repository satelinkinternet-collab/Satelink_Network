// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/EligibilityPolicy.sol";

contract EligibilityPolicyTest is Test {
    EligibilityPolicy policy;
    address admin = address(this);
    address scorer = address(0x2);

    // Default thresholds
    uint256 constant MIN_OPS = 10;
    uint256 constant MIN_UPTIME = 9500; // 95%
    uint256 constant MIN_SCORE = 7000;  // 70%
    uint256 constant MAX_DRIFT = 30;    // 30 seconds

    function setUp() public {
        policy = new EligibilityPolicy(MIN_OPS, MIN_UPTIME, MIN_SCORE, MAX_DRIFT);
        policy.grantRole(policy.SCORER_ROLE(), scorer);
    }

    function testThresholds() public {
        assertEq(policy.minOpsCount(), MIN_OPS);
        assertEq(policy.minUptimeBP(), MIN_UPTIME);
        assertEq(policy.minScoreBP(), MIN_SCORE);
        assertEq(policy.maxHeartbeatDriftSec(), MAX_DRIFT);
    }

    function testSubmitEligibleScore() public {
        bytes32 nodeId = keccak256("node-1");
        vm.prank(scorer);
        policy.submitScore(1, nodeId, 15, 9800, 8500, 10);

        assertTrue(policy.isEligible(1, nodeId));
        assertEq(policy.getEligibleCount(1), 1);
    }

    function testSubmitIneligibleScore_LowOps() public {
        bytes32 nodeId = keccak256("node-2");
        vm.prank(scorer);
        policy.submitScore(1, nodeId, 5, 9800, 8500, 10); // ops < 10

        assertFalse(policy.isEligible(1, nodeId));
        assertEq(policy.getEligibleCount(1), 0);
    }

    function testSubmitIneligibleScore_LowUptime() public {
        bytes32 nodeId = keccak256("node-3");
        vm.prank(scorer);
        policy.submitScore(1, nodeId, 15, 9000, 8500, 10); // uptime < 95%

        assertFalse(policy.isEligible(1, nodeId));
    }

    function testSubmitIneligibleScore_HighDrift() public {
        bytes32 nodeId = keccak256("node-4");
        vm.prank(scorer);
        policy.submitScore(1, nodeId, 15, 9800, 8500, 60); // drift > 30

        assertFalse(policy.isEligible(1, nodeId));
    }

    function testFinalizeEpoch() public {
        bytes32 nodeId = keccak256("node-1");
        vm.prank(scorer);
        policy.submitScore(1, nodeId, 15, 9800, 8500, 10);

        vm.prank(scorer);
        policy.finalizeEpoch(1);

        assertTrue(policy.epochFinalized(1));
    }

    function testCannotSubmitAfterFinalize() public {
        vm.prank(scorer);
        policy.finalizeEpoch(1);

        bytes32 nodeId = keccak256("node-1");
        vm.prank(scorer);
        vm.expectRevert(abi.encodeWithSelector(EligibilityPolicy.EpochAlreadyFinalized.selector, 1));
        policy.submitScore(1, nodeId, 15, 9800, 8500, 10);
    }

    function testOnlyScorerCanSubmit() public {
        bytes32 nodeId = keccak256("node-1");
        vm.prank(address(0x99));
        vm.expectRevert();
        policy.submitScore(1, nodeId, 15, 9800, 8500, 10);
    }

    function testUpdateThresholds() public {
        policy.updateThresholds(20, 9000, 6000, 60);
        assertEq(policy.minOpsCount(), 20);
        assertEq(policy.minUptimeBP(), 9000);
        assertEq(policy.minScoreBP(), 6000);
        assertEq(policy.maxHeartbeatDriftSec(), 60);
    }

    function testUpdateThresholdsInvalid() public {
        vm.expectRevert(EligibilityPolicy.InvalidThresholds.selector);
        policy.updateThresholds(10, 10001, 7000, 30); // uptime > 10000
    }

    function testBatchSubmit() public {
        bytes32[] memory nodeIds = new bytes32[](3);
        uint256[] memory ops = new uint256[](3);
        uint256[] memory uptimes = new uint256[](3);
        uint256[] memory scores = new uint256[](3);
        uint256[] memory drifts = new uint256[](3);

        nodeIds[0] = keccak256("a"); ops[0] = 15; uptimes[0] = 9800; scores[0] = 8500; drifts[0] = 5;
        nodeIds[1] = keccak256("b"); ops[1] = 3;  uptimes[1] = 9800; scores[1] = 8500; drifts[1] = 5; // ineligible
        nodeIds[2] = keccak256("c"); ops[2] = 20; uptimes[2] = 9900; scores[2] = 9000; drifts[2] = 2;

        vm.prank(scorer);
        policy.submitScoresBatch(1, nodeIds, ops, uptimes, scores, drifts);

        assertEq(policy.getEligibleCount(1), 2);
        assertTrue(policy.isEligible(1, nodeIds[0]));
        assertFalse(policy.isEligible(1, nodeIds[1]));
        assertTrue(policy.isEligible(1, nodeIds[2]));
    }
}
