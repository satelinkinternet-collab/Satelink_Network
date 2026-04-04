// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/NodeRegistryV2.sol";

contract NodeRegistryV2Test is Test {
    NodeRegistryV2 registry;
    address admin = address(this);
    address operator1 = address(0x1);
    
    function setUp() public {
        registry = new NodeRegistryV2(admin);
        // Grant registrar role to admin
        registry.grantRole(registry.REGISTRAR_ROLE(), admin);
        registry.grantRole(registry.OPERATOR_ROLE(), operator1);
    }
    
    function testRegisterNode() public {
        bytes32 nodeId = keccak256("node-1");
        registry.registerNode(nodeId, operator1, "vps", "us-east", "");
        
        (bytes32 id, address owner,,,,,,) = registry.nodes(nodeId);
        assertEq(id, nodeId);
        assertEq(owner, operator1);
    }
    
    function testNonRegistrarCannotRegister() public {
        bytes32 nodeId = keccak256("node-2");
        
        vm.prank(operator1);
        vm.expectRevert();
        registry.registerNode(nodeId, operator1, "router", "in-south", "");
    }
    
    function testActivateNode() public {
        bytes32 nodeId = keccak256("node-3");
        registry.registerNode(nodeId, operator1, "vps", "eu-west", "");
        
        vm.prank(operator1);
        registry.setActive(nodeId, true);
        
        assertEq(registry.totalActive(), 1);
    }
}
