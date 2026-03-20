// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract MockUSDT {
    mapping(address => uint) public balanceOf;
    constructor(uint initialSupply) {
        balanceOf[msg.sender] = initialSupply;
    }
    function transfer(address to, uint amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insf");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function decimals() public pure returns (uint8) { return 6; }
}
