// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/MockUSDT.sol";
import "../contracts/RevenueVault.sol";
import "../contracts/NodeRegistryV2.sol";
import "../contracts/ClaimsWithdrawals.sol";
import "../contracts/ClaimsContract.sol";
import "../contracts/EpochAnchor.sol";
import "../contracts/SplitEngine.sol";
import "../contracts/RevenueDistributor.sol";
import "../contracts/EligibilityPolicy.sol";
import "../contracts/GovernanceTimelock.sol";

/**
 * @title DeployAllFoundry
 * @notice Deploys all Satelink contracts to Fuse Spark testnet.
 *
 * Usage:
 *   forge script script/DeployAllFoundry.s.sol:DeployAllFoundry \
 *     --rpc-url fuse_spark \
 *     --broadcast \
 *     -vvvv
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY - deployer wallet private key
 *   ORACLE_PUBLIC_KEY    - oracle address for EpochAnchor
 */
contract DeployAllFoundry is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_PUBLIC_KEY");

        vm.startBroadcast(deployerKey);

        address deployer = vm.addr(deployerKey);

        // ── 1. MockUSDT (testnet only) ──────────────────────────────
        MockUSDT usdt = new MockUSDT();

        // ── 2. RevenueVault ─────────────────────────────────────────
        RevenueVault vault = new RevenueVault(address(usdt));

        // ── 3. NodeRegistryV2 ───────────────────────────────────────
        NodeRegistryV2 registry = new NodeRegistryV2(deployer);

        // ── 4. EpochAnchor ──────────────────────────────────────────
        EpochAnchor anchor = new EpochAnchor(deployer, oracleAddress);

        // ── 5. ClaimsWithdrawals ────────────────────────────────────
        ClaimsWithdrawals claimsWd = new ClaimsWithdrawals(address(anchor), address(vault));

        // ── 6. ClaimsContract ───────────────────────────────────────
        ClaimsContract claims = new ClaimsContract(address(vault));

        // ── 7. SplitEngine ──────────────────────────────────────────
        SplitEngine splitEngine = new SplitEngine();

        // ── 8. RevenueDistributor ───────────────────────────────────
        // Using deployer as all pool addresses for testnet
        RevenueDistributor distributor = new RevenueDistributor(
            address(usdt),
            deployer, // nodeOperatorPool
            deployer, // coreTreasury
            deployer, // builderRewardsPool
            deployer, // distributionPool
            deployer, // infraReserve
            deployer  // admin
        );

        // ── 9. EligibilityPolicy ────────────────────────────────────
        EligibilityPolicy eligibility = new EligibilityPolicy(
            10,    // minOpsCount
            9500,  // minUptimeBP (95%)
            7000,  // minScoreBP (70%)
            30     // maxHeartbeatDriftSec
        );

        // ── 10. GovernanceTimelock ──────────────────────────────────
        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = deployer;

        GovernanceTimelock timelock = new GovernanceTimelock(proposers, executors, deployer);

        // ── Role Grants ─────────────────────────────────────────────
        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claimsWd));
        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claims));
        vault.grantRole(vault.DEPOSITOR_ROLE(), deployer);
        vault.grantRole(vault.DEPOSITOR_ROLE(), address(distributor));
        eligibility.grantRole(eligibility.SCORER_ROLE(), deployer);

        vm.stopBroadcast();

        // ── Log Addresses ───────────────────────────────────────────
        console.log("=== Satelink Deployment Complete ===");
        console.log("MockUSDT:           ", address(usdt));
        console.log("RevenueVault:       ", address(vault));
        console.log("NodeRegistryV2:     ", address(registry));
        console.log("EpochAnchor:        ", address(anchor));
        console.log("ClaimsWithdrawals:  ", address(claimsWd));
        console.log("ClaimsContract:     ", address(claims));
        console.log("SplitEngine:        ", address(splitEngine));
        console.log("RevenueDistributor: ", address(distributor));
        console.log("EligibilityPolicy:  ", address(eligibility));
        console.log("GovernanceTimelock: ", address(timelock));
    }
}
