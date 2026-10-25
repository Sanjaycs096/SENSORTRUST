// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title SensorTrustProvenance
 * @notice Tamper-evident environmental observation digest & review audit registry.
 * @dev Designed for IEEE ClimateChain Global Hackathon 2026.
 *
 * CRITICAL BOUNDARY PRINCIPLE:
 * This contract stores cryptographic hashes and append-only state transitions.
 * It DOES NOT certify physical atmospheric truth. It certifies that an observation
 * canonical digest was submitted at a verifiable time, and that authorized reviewers
 * took specific, recorded audit actions.
 *
 * Raw measurement coordinates, PII, and full LLM prompts remain OFF-CHAIN.
 */
contract SensorTrustProvenance {

    // --- Access Control Roles ---
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    address public admin;
    mapping(address => mapping(bytes32 => bool)) public hasRole;

    // --- Decision Types ---
    enum DecisionType {
        APPROVE,                // 0
        REJECT,                 // 1
        REQUEST_RECALIBRATION   // 2
    }

    // --- Record Structs ---
    struct ObservationRecord {
        bytes32 observationDigest;    // SHA-256 / Keccak-256 of canonical JSON
        address submitter;
        uint256 timestampAnchored;
        bool exists;
    }

    struct ReviewEvent {
        bytes32 decisionDigest;       // Hash of reviewer verdict + reason payload
        DecisionType decision;
        address reviewer;
        uint256 timestampDecided;
        string reasonMetadataUri;     // IPFS cid or sha256 reference URI
    }

    // --- State Storage ---
    // observationId (UUID as bytes32) => ObservationRecord
    mapping(bytes32 => ObservationRecord) private observations;

    // observationId => list of chronological review decisions (append-only)
    mapping(bytes32 => ReviewEvent[]) private reviewHistories;

    // Global counter
    uint256 public totalObservationsAnchored;
    uint256 public totalReviewDecisionsRecorded;

    // --- Events ---
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    event ObservationAnchored(
        bytes32 indexed observationId,
        bytes32 observationDigest,
        address indexed submitter,
        uint256 timestampAnchored
    );

    event ReviewDecisionRecorded(
        bytes32 indexed observationId,
        bytes32 decisionDigest,
        DecisionType decision,
        address indexed reviewer,
        uint256 timestampDecided,
        uint256 historyIndex
    );

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "SensorTrust: caller is not admin");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(hasRole[msg.sender][role] || msg.sender == admin, "SensorTrust: unauthorized role");
        _;
    }

    constructor() {
        admin = msg.sender;
        // Grant admin the default roles
        hasRole[msg.sender][REVIEWER_ROLE] = true;
        hasRole[msg.sender][RELAYER_ROLE] = true;
        emit RoleGranted(REVIEWER_ROLE, msg.sender, msg.sender);
        emit RoleGranted(RELAYER_ROLE, msg.sender, msg.sender);
    }

    // --- Role Management ---
    function grantRole(bytes32 role, address account) external onlyAdmin {
        hasRole[account][role] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyAdmin {
        hasRole[account][role] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    // --- Core Anchoring Functions ---

    /**
     * @notice Anchor a canonical observation digest.
     * @param observationId Unique 32-byte identifier for the observation.
     * @param observationDigest Cryptographic digest (SHA-256) of canonicalized payload.
     */
    function anchorObservation(
        bytes32 observationId,
        bytes32 observationDigest
    ) external onlyRole(RELAYER_ROLE) {
        require(observationId != bytes32(0), "SensorTrust: empty observationId");
        require(observationDigest != bytes32(0), "SensorTrust: empty observationDigest");
        require(!observations[observationId].exists, "SensorTrust: observationId already anchored");

        observations[observationId] = ObservationRecord({
            observationDigest: observationDigest,
            submitter: msg.sender,
            timestampAnchored: block.timestamp,
            exists: true
        });

        totalObservationsAnchored++;

        emit ObservationAnchored(
            observationId,
            observationDigest,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Record a human review decision against an anchored observation.
     * @dev Decision history is strictly append-only. New decisions supersede older ones without deleting history.
     */
    function recordReviewDecision(
        bytes32 observationId,
        bytes32 decisionDigest,
        DecisionType decision,
        string calldata reasonMetadataUri
    ) external onlyRole(REVIEWER_ROLE) {
        require(observations[observationId].exists, "SensorTrust: observation does not exist");
        require(decisionDigest != bytes32(0), "SensorTrust: empty decisionDigest");

        ReviewEvent memory rev = ReviewEvent({
            decisionDigest: decisionDigest,
            decision: decision,
            reviewer: msg.sender,
            timestampDecided: block.timestamp,
            reasonMetadataUri: reasonMetadataUri
        });

        reviewHistories[observationId].push(rev);
        uint256 historyIndex = reviewHistories[observationId].length - 1;
        totalReviewDecisionsRecorded++;

        emit ReviewDecisionRecorded(
            observationId,
            decisionDigest,
            decision,
            msg.sender,
            block.timestamp,
            historyIndex
        );
    }

    // --- Verification & Read Queries ---

    /**
     * @notice Retrieve observation record details.
     */
    function getObservation(bytes32 observationId) external view returns (
        bytes32 observationDigest,
        address submitter,
        uint256 timestampAnchored,
        bool exists
    ) {
        ObservationRecord memory obs = observations[observationId];
        return (obs.observationDigest, obs.submitter, obs.timestampAnchored, obs.exists);
    }

    /**
     * @notice Verify whether a candidate digest matches the on-chain recorded digest.
     */
    function verifyObservationDigest(
        bytes32 observationId,
        bytes32 candidateDigest
    ) external view returns (bool isMatched, bool exists) {
        if (!observations[observationId].exists) {
            return (false, false);
        }
        return (observations[observationId].observationDigest == candidateDigest, true);
    }

    /**
     * @notice Count total review decisions recorded for an observation.
     */
    function getReviewCount(bytes32 observationId) external view returns (uint256) {
        return reviewHistories[observationId].length;
    }

    /**
     * @notice Retrieve a specific review event by index.
     */
    function getReviewDecision(
        bytes32 observationId,
        uint256 index
    ) external view returns (
        bytes32 decisionDigest,
        DecisionType decision,
        address reviewer,
        uint256 timestampDecided,
        string memory reasonMetadataUri
    ) {
        require(index < reviewHistories[observationId].length, "SensorTrust: review index out of range");
        ReviewEvent memory rev = reviewHistories[observationId][index];
        return (
            rev.decisionDigest,
            rev.decision,
            rev.reviewer,
            rev.timestampDecided,
            rev.reasonMetadataUri
        );
    }
}
