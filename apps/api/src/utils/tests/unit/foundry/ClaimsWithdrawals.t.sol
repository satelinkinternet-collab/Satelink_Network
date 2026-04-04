// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/EpochAnchor.sol";
import "../../contracts/RevenueVault.sol";
import "../../contracts/ClaimsWithdrawals.sol";
import "../../contracts/MockUSDT.sol";

contract ClaimsWithdrawalsTest is Test {
    EpochAnchor anchor;
    RevenueVault vault;
    ClaimsWithdrawals claims;
    MockUSDT usdt;

    address admin = address(0x1);
    address oracle = address(0x2);
    address operator1 = address(0x3);
    address operator2 = address(0x4);

    bytes32 root;
    bytes32[] proof1;
    bytes32[] proof2;

    uint256 claimAmount1 = 1000 * 10**6;
    uint256 claimAmount2 = 500 * 10**6;

    function setUp() public {
        vm.startPrank(admin);
        
        usdt = new MockUSDT();
        anchor = new EpochAnchor(admin, oracle);
        vault = new RevenueVault(address(usdt));
        claims = new ClaimsWithdrawals(address(anchor), address(vault));

        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claims));
        
        vm.stopPrank();

        bytes32 leaf1 = keccak256(bytes.concat(keccak256(abi.encode(uint256(1), operator1, claimAmount1))));
        bytes32 leaf2 = keccak256(bytes.concat(keccak256(abi.encode(uint256(1), operator2, claimAmount2))));
        
        // Setup Merkle Tree (2 leaves)
        bytes32 left = leaf1 < leaf2 ? leaf1 : leaf2;
        bytes32 right = leaf1 < leaf2 ? leaf2 : leaf1;

        root = keccak256(bytes.concat(left, right));

        proof1 = new bytes32[](1);
        proof2 = new bytes32[](1);
        if (leaf1 == left) {
            proof1[0] = right;
            proof2[0] = left;
        } else {
            proof1[0] = left;
            proof2[0] = right;
        }

        // Anchor the epoch
        vm.prank(oracle);
        anchor.submitEpochRoot(1, root, claimAmount1 + claimAmount2);
        
        // Deposit into vault
        vm.startPrank(admin);
        usdt.transfer(address(vault), 5000 * 10**6);
        vm.stopPrank();
    }

    function testClaimAndWithdraw() public {
        vm.startPrank(operator1);
        
        claims.claim(1, claimAmount1, proof1);
        assertEq(claims.availableBalances(operator1), claimAmount1);

        uint256 half = claimAmount1 / 2;
        bytes32 claimId = keccak256(abi.encodePacked(operator1, uint256(1), block.timestamp));
        
        claims.withdraw(claimId, half);
        
        assertEq(usdt.balanceOf(operator1), half);
        assertEq(claims.availableBalances(operator1), claimAmount1 - half);
        
        vm.stopPrank();
    }

    function testClaimPastDeadlineReverts() public {
        vm.warp(block.timestamp + 49 days);
        
        vm.startPrank(operator1);
        vm.expectRevert(ClaimsWithdrawals.ClaimDeadlinePassed.selector);
        claims.claim(1, claimAmount1, proof1);
        vm.stopPrank();
    }

    function testPartialWithdrawals() public {
        vm.startPrank(operator1);
        claims.claim(1, claimAmount1, proof1);
        
        bytes32 claimId = keccak256(abi.encodePacked(operator1, uint256(1), block.timestamp));
        
        claims.withdraw(claimId, 100 * 10**6);
        claims.withdraw(claimId, 200 * 10**6);
        
        assertEq(usdt.balanceOf(operator1), 300 * 10**6);
        vm.stopPrank();
    }
}
