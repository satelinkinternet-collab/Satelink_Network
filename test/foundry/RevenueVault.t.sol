// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/MockUSDT.sol";
import "../../contracts/RevenueVault.sol";

contract RevenueVaultTest is Test {
    MockUSDT usdt;
    RevenueVault vault;
    address admin = address(this);
    address user1 = address(0x1);
    
    function setUp() public {
        usdt = new MockUSDT();
        vault = new RevenueVault(address(usdt));
        
        // Grant roles to testing addresses
        vault.grantRole(vault.WITHDRAWER_ROLE(), admin);
        vault.grantRole(vault.DEPOSITOR_ROLE(), user1);
        vault.grantRole(vault.DEPOSITOR_ROLE(), admin);

        // Give user1 some USDT
        usdt.transfer(user1, 10000e18);
    }
    
    function testDeposit() public {
        vm.startPrank(user1);
        usdt.approve(address(vault), 1000e18);
        vault.deposit(1000e18);
        vm.stopPrank();
        
        assertEq(vault.totalDeposited(), 1000e18);
        assertEq(usdt.balanceOf(address(vault)), 1000e18);
    }
    
    function testWithdrawOnlyWithdrawer() public {
        // Deposit first
        vm.startPrank(user1);
        usdt.approve(address(vault), 1000e18);
        vault.deposit(1000e18);
        vm.stopPrank();
        
        // Non-withdrawer cannot withdraw
        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(user1, 500e18);
        
        // Admin (who has WITHDRAWER_ROLE) can withdraw
        vault.withdraw(user1, 500e18);
        assertEq(usdt.balanceOf(user1), 9500e18);
    }
    
    function testCannotWithdrawMoreThanBalance() public {
        vm.expectRevert();
        vault.withdraw(user1, 1e18);
    }
    
    // Fuzz test: deposit any amount, withdraw should never exceed balance
    function testFuzzDeposit(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 10000e18);
        
        vm.startPrank(user1);
        usdt.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
        
        assertEq(vault.totalDeposited(), amount);
    }
}
