// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IRevenueVault {
    function withdraw(address to, uint256 amount) external;
    function token() external view returns (address);
}

contract ClaimsContract is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIM_CREATOR_ROLE = keccak256("CLAIM_CREATOR_ROLE");

    IRevenueVault public immutable vault;
    IERC20 public immutable usdt;

    uint256 public constant CLAIM_EXPIRY = 48 days;

    struct Claim {
        address beneficiary;
        uint256 amount;
        uint256 createdAt;
        bool claimed;
    }

    mapping(bytes32 => Claim) public claims;
    mapping(address => uint256) public userBalances;
    uint256 private nonce;

    event ClaimCreated(bytes32 indexed claimId, address indexed beneficiary, uint256 amount);
    event ClaimRedeemed(bytes32 indexed claimId, address indexed beneficiary, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);

    constructor(address _vault) {
        vault = IRevenueVault(_vault);
        usdt = IERC20(vault.token());
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CLAIM_CREATOR_ROLE, msg.sender);
    }

    function createClaim(address beneficiary, uint256 amount)
        external
        onlyRole(CLAIM_CREATOR_ROLE)
        returns (bytes32 claimId)
    {
        claimId = keccak256(abi.encodePacked(beneficiary, amount, block.timestamp, nonce++));

        claims[claimId] = Claim({beneficiary: beneficiary, amount: amount, createdAt: block.timestamp, claimed: false});

        emit ClaimCreated(claimId, beneficiary, amount);
    }

    function claimReward(bytes32 claimId) external nonReentrant {
        Claim storage c = claims[claimId];

        require(c.beneficiary == msg.sender, "Not beneficiary");
        require(!c.claimed, "Already claimed");
        require(block.timestamp <= c.createdAt + CLAIM_EXPIRY, "Claim expired");

        c.claimed = true;
        userBalances[msg.sender] += c.amount;

        vault.withdraw(address(this), c.amount);

        emit ClaimRedeemed(claimId, msg.sender, c.amount);
    }

    function withdrawFunds(uint256 amount) external nonReentrant {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");

        userBalances[msg.sender] -= amount;
        usdt.safeTransfer(msg.sender, amount);

        emit FundsWithdrawn(msg.sender, amount);
    }
}
