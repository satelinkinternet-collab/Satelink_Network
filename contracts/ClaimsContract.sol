// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRevenueVault {
    function withdraw(address to, uint256 amount) external;
}

contract ClaimsContract {
    address public owner;
    IRevenueVault public vault;
    uint256 private _claimNonce;
    
    struct Claim {
        uint256 amount;
        uint256 expiryTimestamp;
        bool claimed;
    }

    mapping(bytes32 => Claim) public claims; // claimId -> Claim
    mapping(bytes32 => address) public claimOwner;
    mapping(address => uint256) public userBalances; // Internal ledger: Claimed -> Waiting withdrawal

    event ClaimCreated(bytes32 indexed claimId, address indexed user, uint256 amount, uint256 expiry);
    event Claimed(bytes32 indexed claimId, address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _vault) {
        owner = msg.sender;
        vault = IRevenueVault(_vault);
    }

    function createClaim(address user, uint256 amount) external onlyOwner returns (bytes32) {
        _claimNonce++;
        bytes32 claimId = keccak256(abi.encodePacked(user, amount, block.timestamp, block.prevrandao, _claimNonce));
        uint256 expiry = block.timestamp + 48 days;

        claims[claimId] = Claim({
            amount: amount,
            expiryTimestamp: expiry,
            claimed: false
        });
        claimOwner[claimId] = user;

        emit ClaimCreated(claimId, user, amount, expiry);
        return claimId;
    }

    // Phase 1: Claim (Update internal ledger only)
    function claimReward(bytes32 claimId) external {
        require(claimOwner[claimId] == msg.sender, "Not claim owner");
        
        Claim storage c = claims[claimId];
        require(!c.claimed, "Already claimed");
        require(block.timestamp <= c.expiryTimestamp, "Claim expired");
        
        c.claimed = true;
        userBalances[msg.sender] += c.amount;
        
        emit Claimed(claimId, msg.sender, c.amount);
    }

    // Phase 2: Withdraw (Move funds if liquidity exists)
    function withdrawFunds(uint256 amount) external {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        userBalances[msg.sender] -= amount;
        
        // This fails if Vault has insufficient liquidity (handled by Vault logic or revert)
        vault.withdraw(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
}
