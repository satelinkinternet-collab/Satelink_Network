// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title NodeRegistryV2 (FIXED)
 * @notice Satelink Network Node Registry — Production-hardened version
 * @dev AUDIT FIX: Added AccessControl, Pausable, ReentrancyGuard
 *      Previously: registerNode() and setActive() had NO access control
 *      Now: Role-based access — REGISTRAR_ROLE required for registration
 */
contract NodeRegistryV2 is AccessControl, Pausable, ReentrancyGuard {

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant REGISTRAR_ROLE  = keccak256("REGISTRAR_ROLE");
    bytes32 public constant OPERATOR_ROLE   = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");
    bytes32 public constant ADMIN_ROLE      = keccak256("ADMIN_ROLE");

    // ─── Node State ───────────────────────────────────────────────────────────
    enum NodeStatus { INACTIVE, ACTIVE, SUSPENDED, DECOMMISSIONED }

    struct Node {
        bytes32  nodeId;
        address  owner;
        string   nodeType;       // "router" | "edge" | "vps" | "managed"
        string   region;
        uint256  registeredAt;
        uint256  activatedAt;
        NodeStatus status;
        bytes    metadata;       // ABI-encoded extra data
    }

    // ─── Storage ──────────────────────────────────────────────────────────────
    mapping(bytes32 => Node) public nodes;
    mapping(address => bytes32[]) public nodesByOwner;
    bytes32[] public allNodeIds;

    uint256 public totalActive;
    uint256 public constant MAX_NODES_PER_OWNER = 1000; // sybil cap

    // ─── Events ───────────────────────────────────────────────────────────────
    event NodeRegistered(bytes32 indexed nodeId, address indexed owner, string nodeType, string region);
    event NodeActivated(bytes32 indexed nodeId, address indexed activatedBy);
    event NodeDeactivated(bytes32 indexed nodeId, address indexed deactivatedBy, string reason);
    event NodeSuspended(bytes32 indexed nodeId, address indexed suspendedBy, string reason);
    event NodeDecommissioned(bytes32 indexed nodeId, address indexed by);
    event NodeMetadataUpdated(bytes32 indexed nodeId);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NodeAlreadyRegistered(bytes32 nodeId);
    error NodeNotFound(bytes32 nodeId);
    error NotNodeOwner(bytes32 nodeId, address caller);
    error NodeNotActive(bytes32 nodeId);
    error MaxNodesPerOwnerExceeded(address owner);
    error InvalidNodeType(string nodeType);

    // ─── Valid node types ─────────────────────────────────────────────────────
    mapping(string => bool) private _validNodeTypes;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);

        _validNodeTypes["router"]  = true;
        _validNodeTypes["edge"]    = true;
        _validNodeTypes["vps"]     = true;
        _validNodeTypes["managed"] = true;
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Register a new node
     * @dev AUDIT FIX: Previously had NO access control — anyone could register any node.
     *      Now requires REGISTRAR_ROLE (granted to backend service account).
     *      Node owner is passed as parameter, separate from msg.sender.
     */
    function registerNode(
        bytes32 nodeId,
        address owner,
        string calldata nodeType,
        string calldata region,
        bytes calldata metadata
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused nonReentrant {
        if (nodes[nodeId].registeredAt != 0) revert NodeAlreadyRegistered(nodeId);
        if (!_validNodeTypes[nodeType]) revert InvalidNodeType(nodeType);
        if (nodesByOwner[owner].length >= MAX_NODES_PER_OWNER) revert MaxNodesPerOwnerExceeded(owner);

        nodes[nodeId] = Node({
            nodeId:       nodeId,
            owner:        owner,
            nodeType:     nodeType,
            region:       region,
            registeredAt: block.timestamp,
            activatedAt:  0,
            status:       NodeStatus.INACTIVE,
            metadata:     metadata
        });

        nodesByOwner[owner].push(nodeId);
        allNodeIds.push(nodeId);

        emit NodeRegistered(nodeId, owner, nodeType, region);
    }

    /**
     * @notice Activate a registered node
     * @dev AUDIT FIX: Previously had NO access control on setActive.
     *      Now: OPERATOR_ROLE required, OR node owner can activate their own node.
     */
    function setActive(bytes32 nodeId, bool active) external whenNotPaused {
        Node storage node = nodes[nodeId];
        if (node.registeredAt == 0) revert NodeNotFound(nodeId);

        bool isOperator = hasRole(OPERATOR_ROLE, msg.sender);
        bool isOwner    = (node.owner == msg.sender);

        require(isOperator || isOwner, "NodeRegistryV2: unauthorized");

        if (active) {
            require(
                node.status == NodeStatus.INACTIVE || node.status == NodeStatus.SUSPENDED,
                "NodeRegistryV2: cannot activate from current status"
            );
            node.status = NodeStatus.ACTIVE;
            if (node.activatedAt == 0) node.activatedAt = block.timestamp;
            totalActive++;
            emit NodeActivated(nodeId, msg.sender);
        } else {
            require(node.status == NodeStatus.ACTIVE, "NodeRegistryV2: node not active");
            node.status = NodeStatus.INACTIVE;
            totalActive--;
            emit NodeDeactivated(nodeId, msg.sender, "manual deactivation");
        }
    }

    /**
     * @notice Suspend a node (admin/operator only) — stronger than deactivate
     */
    function suspendNode(bytes32 nodeId, string calldata reason)
        external onlyRole(OPERATOR_ROLE)
    {
        Node storage node = nodes[nodeId];
        if (node.registeredAt == 0) revert NodeNotFound(nodeId);
        if (node.status == NodeStatus.ACTIVE) totalActive--;
        node.status = NodeStatus.SUSPENDED;
        emit NodeSuspended(nodeId, msg.sender, reason);
    }

    /**
     * @notice Permanently decommission a node
     */
    function decommissionNode(bytes32 nodeId)
        external onlyRole(ADMIN_ROLE)
    {
        Node storage node = nodes[nodeId];
        if (node.registeredAt == 0) revert NodeNotFound(nodeId);
        if (node.status == NodeStatus.ACTIVE) totalActive--;
        node.status = NodeStatus.DECOMMISSIONED;
        emit NodeDecommissioned(nodeId, msg.sender);
    }

    /**
     * @notice Update node metadata (owner or operator)
     */
    function updateMetadata(bytes32 nodeId, bytes calldata metadata) external whenNotPaused {
        Node storage node = nodes[nodeId];
        if (node.registeredAt == 0) revert NodeNotFound(nodeId);
        require(
            node.owner == msg.sender || hasRole(OPERATOR_ROLE, msg.sender),
            "NodeRegistryV2: unauthorized"
        );
        node.metadata = metadata;
        emit NodeMetadataUpdated(nodeId);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getNode(bytes32 nodeId) external view returns (Node memory) {
        return nodes[nodeId];
    }

    function isNodeActive(bytes32 nodeId) external view returns (bool) {
        return nodes[nodeId].status == NodeStatus.ACTIVE;
    }

    function getNodesByOwner(address owner) external view returns (bytes32[] memory) {
        return nodesByOwner[owner];
    }

    function getTotalRegistered() external view returns (uint256) {
        return allNodeIds.length;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function addValidNodeType(string calldata nodeType) external onlyRole(ADMIN_ROLE) {
        _validNodeTypes[nodeType] = true;
    }
}
