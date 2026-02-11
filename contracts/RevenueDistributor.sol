// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INodeRegistry {
    function getNode(uint256 i) external view returns (address wallet, bool active);
}

contract RevenueDistributor {
    INodeRegistry public registry;

    event Distributed(uint256 indexed nodeId, address indexed wallet, uint256 amount);

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry");
        registry = INodeRegistry(_registry);
    }

    function distribute(uint256 nodeId) external payable {
        require(msg.value > 0, "No value sent");

        (address wallet, bool active) = registry.getNode(nodeId);
        require(active, "Node not active");
        require(wallet != address(0), "Invalid node wallet");

        (bool sent, ) = wallet.call{value: msg.value}("");
        require(sent, "Failed to send Ether");

        emit Distributed(nodeId, wallet, msg.value);
    }
}
