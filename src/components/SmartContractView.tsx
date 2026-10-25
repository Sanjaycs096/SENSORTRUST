import React, { useState } from 'react';

const SOLIDITY_CODE = `// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title SensorTrustProvenance
 * @notice Tamper-evident environmental observation digest & review audit registry.
 * @dev IEEE ClimateChain Global Hackathon 2026.
 *
 * CRITICAL BOUNDARY PRINCIPLE:
 * This contract stores cryptographic hashes and append-only state transitions.
 * It DOES NOT certify physical atmospheric truth. It certifies that an observation
 * canonical digest was submitted at a verifiable time, and that authorized reviewers
 * took specific, recorded audit actions.
 */
contract SensorTrustProvenance {
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    address public admin;
    mapping(address => mapping(bytes32 => bool)) public hasRole;

    enum DecisionType { APPROVE, REJECT, REQUEST_RECALIBRATION }

    struct ObservationRecord {
        bytes32 observationDigest;
        address submitter;
        uint256 timestampAnchored;
        bool exists;
    }

    struct ReviewEvent {
        bytes32 decisionDigest;
        DecisionType decision;
        address reviewer;
        uint256 timestampDecided;
        string reasonMetadataUri;
    }

    mapping(bytes32 => ObservationRecord) private observations;
    mapping(bytes32 => ReviewEvent[]) private reviewHistories;

    uint256 public totalObservationsAnchored;
    uint256 public totalReviewDecisionsRecorded;

    event ObservationAnchored(bytes32 indexed observationId, bytes32 observationDigest, address indexed submitter, uint256 timestampAnchored);
    event ReviewDecisionRecorded(bytes32 indexed observationId, bytes32 decisionDigest, DecisionType decision, address indexed reviewer, uint256 timestampDecided, uint256 historyIndex);

    modifier onlyRole(bytes32 role) {
        require(hasRole[msg.sender][role] || msg.sender == admin, "SensorTrust: unauthorized role");
        _;
    }

    constructor() {
        admin = msg.sender;
        hasRole[msg.sender][REVIEWER_ROLE] = true;
        hasRole[msg.sender][RELAYER_ROLE] = true;
    }

    function anchorObservation(bytes32 observationId, bytes32 observationDigest) external onlyRole(RELAYER_ROLE) {
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
        emit ObservationAnchored(observationId, observationDigest, msg.sender, block.timestamp);
    }

    function recordReviewDecision(bytes32 observationId, bytes32 decisionDigest, DecisionType decision, string calldata reasonMetadataUri) external onlyRole(REVIEWER_ROLE) {
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
        totalReviewDecisionsRecorded++;
        emit ReviewDecisionRecorded(observationId, decisionDigest, decision, msg.sender, block.timestamp, reviewHistories[observationId].length - 1);
    }

    function verifyObservationDigest(bytes32 observationId, bytes32 candidateDigest) external view returns (bool isMatched, bool exists) {
        if (!observations[observationId].exists) return (false, false);
        return (observations[observationId].observationDigest == candidateDigest, true);
    }
}`;

export const SmartContractView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SOLIDITY_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400">lock</span>
          Smart Contract Architecture &amp; Security Boundaries
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The smart contract acts strictly as an immutable append-only proof ledger. It does not validate air quality physics; rather, it guarantees that observation digests cannot be forged retrospectively and that human reviewer decisions cannot be expunged.
        </p>
      </div>

      {/* Security Threat Mitigation Table */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
          Security Threat Model &amp; Mitigations
        </h4>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300 font-mono">
              <tr>
                <th className="p-3">Threat Vector</th>
                <th className="p-3">Risk Scenario</th>
                <th className="p-3">Architectural Mitigation</th>
                <th className="p-3">Failure Mode / Handling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-rose-300">Replay / Duplicate ID</td>
                <td className="p-3 text-slate-400">Attacker resubmits existing UUID with altered values.</td>
                <td className="p-3 text-emerald-300">Contract enforces `require(!observations[obsId].exists)`.</td>
                <td className="p-3">Transaction reverts; API catches and returns HTTP `409 Conflict`.</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-rose-300">Unauthorized Reviewer</td>
                <td className="p-3 text-slate-400">Malicious user attempts to approve or reject observations.</td>
                <td className="p-3 text-emerald-300">Role modifier `onlyRole(REVIEWER_ROLE)` gates decision functions.</td>
                <td className="p-3">Unauthorized calls revert with `"unauthorized role"`; logged in audit trail.</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-rose-300">Location Stalking</td>
                <td className="p-3 text-slate-400">Citizen sensor raw GPS coordinates exposed publicly.</td>
                <td className="p-3 text-emerald-300">Quantized off-chain to 2 decimal places (~1.1 km box). Zero GPS on-chain.</td>
                <td className="p-3">Public can verify air quality basin without identifying residential homes.</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-rose-300">Node Unavailability</td>
                <td className="p-3 text-slate-400">Local EVM or testnet RPC is temporarily unreachable.</td>
                <td className="p-3 text-emerald-300">Backend flags record `ANCHORING_PENDING` with retry backoff queue.</td>
                <td className="p-3">UI shows explicit "Pending Anchoring" badge; never falsely claims success.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Solidity Code Viewer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-sm">code</span>
            <span className="font-mono text-xs font-semibold text-white">contracts/SensorTrustProvenance.sol</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition"
          >
            <span className="material-symbols-outlined text-xs">content_copy</span>
            <span>{copied ? 'Copied Solidity' : 'Copy Contract'}</span>
          </button>
        </div>

        <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 leading-relaxed max-h-96">
          {SOLIDITY_CODE}
        </pre>
      </div>
    </div>
  );
};
