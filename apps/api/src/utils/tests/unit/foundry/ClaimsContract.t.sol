// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/MockUSDT.sol";
import "../../contracts/RevenueVault.sol";
import "../../contracts/ClaimsContract.sol";

contract ClaimsContractTest is Test {
    MockUSDT usdt;
    RevenueVault vault;
    ClaimsContract claims;
    address admin = address(this);
    address user1 = address(0x1);
    
    function setUp() public {
        usdt = new MockUSDT();
        vault = new RevenueVault(address(usdt));
        claims = new ClaimsContract(address(vault));
        
        // Grant roles
        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claims));
        vault.grantRole(vault.DEPOSITOR_ROLE(), admin);
        
        // Fund the vault
        usdt.approve(address(vault), 50000e18);
        vault.deposit(50000e18);
    }
    
    function testCreateAndClaim() public {
        bytes32 claimId = claims.createClaim(user1, 100e18);
        
        vm.prank(user1);
        claims.claimReward(claimId);
        
        assertEq(claims.userBalances(user1), 100e18);
    }
    
    function testCannotClaimTwice() public {
        bytes32 claimId = claims.createClaim(user1, 100e18);
        
        vm.startPrank(user1);
        claims.claimReward(claimId);
        
        vm.expectRevert("Already claimed");
        claims.claimReward(claimId);
        vm.stopPrank();
    }
    
    function testClaimExpiry() public {
        bytes32 claimId = claims.createClaim(user1, 100e18);
        
        // Warp past 48 days
        vm.warp(block.timestamp + 49 days);
        
        vm.prank(user1);
        vm.expectRevert("Claim expired");
        claims.claimReward(claimId);
    }
    
    function testWithdrawFunds() public {
        bytes32 claimId = claims.createClaim(user1, 100e18);
        
        vm.prank(user1);
        claims.claimReward(claimId);
        
        vm.prank(user1);
        claims.withdrawFunds(100e18);
        
        assertEq(usdt.balanceOf(user1), 100e18);
        assertEq(claims.userBalances(user1), 0);
    }
    
    function testCannotWithdrawMoreThanBalance() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        claims.withdrawFunds(1e18);
    }
}
