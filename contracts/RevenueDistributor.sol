// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RevenueDistributor is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    IERC20 public immutable usdt;

    address public nodeOpPool;
    address public coreTreasury;
    address public builderPool;

    uint256 public nodeOpBps = 5000;
    uint256 public treasuryBps = 3000;
    uint256 public builderBps = 2000;

    event RevenueDistributed(uint256 total, uint256 toNodeOps, uint256 toTreasury, uint256 toBuilders);
    event SplitUpdated(uint256 nodeOpBps, uint256 treasuryBps, uint256 builderBps);

    constructor(address _usdt, address _nodeOpPool, address _coreTreasury, address _builderPool) {
        usdt = IERC20(_usdt);
        nodeOpPool = _nodeOpPool;
        coreTreasury = _coreTreasury;
        builderPool = _builderPool;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
    }

    function distribute(uint256 amount) external onlyRole(DISTRIBUTOR_ROLE) {
        require(amount > 0, "Amount must be > 0");

        uint256 toNodeOps = (amount * nodeOpBps) / 10000;
        uint256 toTreasury = (amount * treasuryBps) / 10000;
        uint256 toBuilders = amount - toNodeOps - toTreasury;

        usdt.safeTransferFrom(msg.sender, nodeOpPool, toNodeOps);
        usdt.safeTransferFrom(msg.sender, coreTreasury, toTreasury);
        usdt.safeTransferFrom(msg.sender, builderPool, toBuilders);

        emit RevenueDistributed(amount, toNodeOps, toTreasury, toBuilders);
    }

    function setSplit(uint256 _nodeOpBps, uint256 _treasuryBps, uint256 _builderBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_nodeOpBps + _treasuryBps + _builderBps == 10000, "Must sum to 10000");
        nodeOpBps = _nodeOpBps;
        treasuryBps = _treasuryBps;
        builderBps = _builderBps;
        emit SplitUpdated(_nodeOpBps, _treasuryBps, _builderBps);
    }
}
