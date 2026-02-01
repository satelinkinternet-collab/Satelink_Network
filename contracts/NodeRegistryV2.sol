// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NodeRegistryV2 {
    struct Node {
        address wallet;
        bool active;
    }

    Node[] private nodes;
    mapping(address => uint256) private indexPlusOne; // 0 means not exists

    event NodeRegistered(address indexed wallet);
    event NodeStatusUpdated(address indexed wallet, bool active);

    function nodeCount() external view returns (uint256) {
        return nodes.length;
    }

    function getNode(uint256 i) external view returns (address wallet, bool active) {
        require(i < nodes.length, "index out of range");
        Node memory n = nodes[i];
        return (n.wallet, n.active);
    }

    function registerNode(address wallet) external {
        require(wallet != address(0), "bad wallet");
        require(indexPlusOne[wallet] == 0, "already registered");

        nodes.push(Node({ wallet: wallet, active: true }));
        indexPlusOne[wallet] = nodes.length;

        emit NodeRegistered(wallet);
        emit NodeStatusUpdated(wallet, true);
    }

    function setActive(address wallet, bool active) external {
        uint256 idx1 = indexPlusOne[wallet];
        require(idx1 != 0, "not registered");
        nodes[idx1 - 1].active = active;

        emit NodeStatusUpdated(wallet, active);
    }
}
