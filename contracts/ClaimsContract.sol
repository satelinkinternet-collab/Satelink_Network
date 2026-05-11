// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title ClaimsContract
 * @notice Pull model claim contract - node operators claim rewards with platform signature
 * @dev Uses EIP-712 typed signatures for secure claim verification
 */
contract ClaimsContract is AccessControl, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(string nodeId,address wallet,uint256 amount,uint256 nonce,uint256 expiry)"
    );

    IERC20 public immutable usdt;
    address public platformSigner;

    mapping(uint256 => bool) public usedNonces;
    mapping(address => uint256) public totalClaimed;

    event Claimed(string indexed nodeId, address indexed wallet, uint256 amount, uint256 nonce);
    event PlatformSignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address _usdt, address _platformSigner) EIP712("SatelinkClaims", "1") {
        require(_usdt != address(0), "Invalid USDT address");
        require(_platformSigner != address(0), "Invalid signer address");

        usdt = IERC20(_usdt);
        platformSigner = _platformSigner;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Claim rewards using platform signature (pull model)
     * @param nodeId The node identifier
     * @param amount Amount in USDT (6 decimals)
     * @param nonce Unique nonce to prevent replay
     * @param expiry Signature expiry timestamp
     * @param signature EIP-712 signature from platform
     */
    function claim(
        string memory nodeId,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) external nonReentrant {
        require(block.timestamp < expiry, "Claim expired");
        require(!usedNonces[nonce], "Nonce already used");
        require(amount > 0, "Amount must be positive");

        // Verify platform signature
        bytes32 structHash = keccak256(abi.encode(
            CLAIM_TYPEHASH,
            keccak256(bytes(nodeId)),
            msg.sender,
            amount,
            nonce,
            expiry
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == platformSigner, "Invalid signature");

        // Mark nonce as used
        usedNonces[nonce] = true;

        // Update total claimed
        totalClaimed[msg.sender] += amount;

        // Transfer USDT from contract to caller (msg.sender pays gas)
        usdt.safeTransfer(msg.sender, amount);

        emit Claimed(nodeId, msg.sender, amount, nonce);
    }

    /**
     * @notice Check if a nonce has been used
     * @param nonce The nonce to check
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    /**
     * @notice Get USDT balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * @notice Update platform signer (admin only)
     * @param newSigner New signer address
     */
    function setPlatformSigner(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newSigner != address(0), "Invalid signer address");
        address oldSigner = platformSigner;
        platformSigner = newSigner;
        emit PlatformSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Emergency withdraw (admin only)
     * @param to Destination address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid destination");
        usdt.safeTransfer(to, amount);
    }

    /**
     * @notice Get the EIP-712 domain separator
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
