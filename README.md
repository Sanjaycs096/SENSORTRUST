# SensorTrust — Environmental Data Integrity & Provenance Platform
**Track:** Track D — Climate Data & Environmental Monitoring  
**Event:** IEEE ClimateChain Global Hackathon 2026  
**Status:** Phase 5 Complete (Final QA, Demo Readiness, Reliability & Hackathon Submission)  
**Tagline:** Trust the Data. Verify the History.

---

## 1. Project Overview & Architecture

SensorTrust is an AI-assisted environmental telemetry integrity and tamper-evident blockchain provenance platform engineered for municipal environmental departments, atmospheric researchers, and citizen-science monitoring networks.

Low-cost optical particle sensors provide dense spatial-temporal data but suffer from uncalibrated baseline drift, unshielded placement, and malicious tampering. Official reference monitors provide high accuracy but sparse coverage. SensorTrust bridges this trust gap through:

1. **Deterministic Physical Invariants:** Instant server-side validation on schema compliance, plausible PM2.5 bounds ($0.0 \le \text{PM2.5} \le 1000.0\ \mu\text{g/m}^3$), clock drift tolerance ($\le 300\text{s}$ future, $\le 24\text{h}$ stale), and deduplication.
2. **Explainable Multi-Tier Anomaly Screening:** Heuristic screening for rate-of-change spikes ($>30\ \mu\text{g/m}^3/\text{min}$), stuck flatline sensor hardware faults, and localized spatial neighbor z-scores ($>3.0\sigma$). Explicitly flags missing context when peer sensors are absent.
3. **Accountable Human Review Queue:** Operational triage queue requiring mandatory justification ($\ge 10$ characters) for every decision (Approve, Reject, Request Recalibration), recorded as append-only historical events.
4. **RFC 8785 Canonical Cryptographic Anchoring:** RFC 8785 JSON Canonicalization Scheme (JCS) + SHA-256 algorithm with verified cross-language parity between TypeScript and Python, establishing an immutable audit trail without exposing sensitive coordinates or personal accounts.
5. **Real EVM Blockchain Provenance:** Live interaction with Solidity smart contract `SensorTrustProvenance.sol` deployed on a local Hardhat EVM (Chain ID 31337). Observation digests and review decisions are anchored in real blocks, returning authentic `0x`-prefixed transaction hashes, gas receipts, and on-chain verification via JSON-RPC `eth_call`.

---

## 2. Technology Stack & Verified Runtime Versions

### Runtime Prerequisites
- **Node.js:** `v20.18.0+` (verified on Node `v20.x`, npm `v10.x`)
- **Python:** `3.10+` (verified on Python `3.10.0`)
- **Operating System:** Windows 10/11, macOS, or Linux (Windows PowerShell commands provided)

### Architecture & Frameworks
- **Blockchain:** Solidity `^0.8.20`, Hardhat 3.x local EVM node, `web3.py` (v7.8.0+), `eth-account`.
- **Backend:** Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.x, SQLite 3, Pytest, Uvicorn.
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 8, shadcn-inspired primitives.
- **Design System:** Calm climate-tech aesthetic with warm neutral background (`#fafaf9`), deep forest-green primary accents, high-contrast status badges, and Google Material Symbols Outlined (`material-symbols-outlined`). Zero third-party icon packages.
- **Deterministic Hashing:** RFC 8785 JCS + SHA-256 algorithm with verified cross-language equivalence.
- **Testing:** 
  - Backend: Pytest suite (**49 tests passed**) with isolated in-memory SQLite and live Hardhat EVM integration (`backend/tests/`).
  - Frontend: Node built-in test runner via `tsx` (**12 unit tests passed**) (`src/core/logic.test.ts`, `src/services/api.test.ts`).
  - End-to-End: Playwright test suite (**8 acceptance tests passed**) (`tests/e2e/frontend.spec.ts`).
  - Lint & Build: TypeScript check (**0 errors**) and Vite build (**clean production bundle**).

---

## 3. Smart Contract Integration (`SensorTrustProvenance.sol`)

The platform integrates with `src/contracts/SensorTrustProvenance.sol`, compiled using Solc 0.8.20:

### Contract Functions Used
- `anchorObservation(bytes32 observationId, bytes32 observationDigest)`:
  Anchors canonical observation digest to the blockchain. Submissions require `RELAYER_ROLE` or `admin`.
- `recordReviewDecision(bytes32 observationId, bytes32 decisionDigest, enum DecisionType decision, string reasonMetadataUri)`:
  Anchors an append-only human review decision with `DecisionType` (APPROVE=0, REJECT=1, REQUEST_RECALIBRATION=2) and an immutable audit pointer.
- `verifyObservationDigest(bytes32 observationId, bytes32 candidateDigest) returns (bool isMatched, bool exists)`:
  Performs read-only on-chain verification via `eth_call`.
- `getObservation(bytes32 observationId) returns (bytes32 observationDigest, address submitter, uint256 timestampAnchored, bool exists)`:
  Retrieves on-chain record details.
- `getReviewCount(bytes32 observationId) returns (uint256)` & `getReviewDecision(bytes32 observationId, uint256 index)`:
  Inspects the append-only history of decisions for an observation.

### Contract Events Used
- `ObservationAnchored(bytes32 indexed observationId, bytes32 observationDigest, address indexed submitter, uint256 timestampAnchored)`
- `ReviewDecisionRecorded(bytes32 indexed observationId, bytes32 decisionDigest, enum DecisionType decision, address indexed reviewer, uint256 timestampDecided, uint256 historyIndex)`

---

## 4. Launching the Full Stack (Repeatable Windows Startup)

Open three separate Windows PowerShell terminals in the repository root `sensortrust`:

### Terminal 1: Launch Local Hardhat EVM Node
```powershell
npx hardhat --config hardhat.config.cjs node --port 8545
```
*Expected Output:*
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Network: Hardhat (Chain ID: 31337)
```

### Terminal 2: Compile Contract & Launch FastAPI Backend
```powershell
# 1. Compile contract artifact
npx hardhat --config hardhat.config.cjs compile

# 2. Launch FastAPI Backend (persists database and automatically connects to local EVM)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Expected Output:*
```
INFO: Application startup complete.
INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```
- API Base: `http://127.0.0.1:8000/api/v1`
- Blockchain Health: `http://127.0.0.1:8000/api/v1/blockchain/status`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Terminal 3: Launch Vite Frontend
```powershell
npm run dev
```
*Expected Output:*
```
VITE v8.3.5 ready in 250 ms
➜  Local:   http://localhost:3000/
```

---

## 5. System Health-Check Checklist

Before initiating a demonstration or evaluation, verify each layer via these quick checks:

| Subsystem | Command / URL | Expected Healthy Output |
| :--- | :--- | :--- |
| **Local EVM** | `curl -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}"` | `{"jsonrpc":"2.0","id":1,"result":"0x7a69"}` (31337) |
| **Backend Health** | `http://127.0.0.1:8000/api/v1/health` | `{"status":"HEALTHY","database":"CONNECTED","blockchain":{"isSimulatedLocalNode":false}}` |
| **Blockchain Status** | `http://127.0.0.1:8000/api/v1/blockchain/status` | `{"connected":true,"chainId":31337,"contractAddress":"0x..."}` |
| **Frontend UI** | `http://localhost:3000` | HTTP 200, Calm Climate-Tech Dashboard loads |
| **Automated Workflow** | `python backend/verify_workflow.py` | `ALL COMPLETE LOCAL-CHAIN WORKFLOW STEPS PASSED WITH 100% SUCCESS!` |

---

## 6. Complete Demonstration Walkthrough (Deterministic Scenario)

> [!TIP]
> For video recording, refer to the [3-Minute Spoken Demo Script](docs/DEMO_SCRIPT.md) and [Demo Recording & Production Checklist](docs/DEMO_RECORDING_CHECKLIST.md).

The demo utilizes synthetic observations clearly identified as demo data to showcase the end-to-end data integrity lifecycle:

### Flow A: Dashboard — Baseline Observations & Integrity Metrics
1. Open `http://localhost:3000`.
2. Notice the **Sample Data Notice** transparently indicating demo seed records.
3. Observe key metrics: Total Ingested Observations, Verification Rates, and Active Anomaly Flagged count.
4. Review the observation feed showing live statuses: `APPROVED` (Green), `FLAGGED` (Amber), `PENDING_REVIEW` (Purple).

### Flow B: Submit Observation — Plausible Reading & Validation Gates
1. Navigate to **Submit Reading** (`/submit`).
2. Click **Load Nominal Preset**. This populates:
   - Observation ID: `urn:uuid:...`
   - Sensor ID: `AQ-Sensor-Nominal-22`
   - PM2.5: `22.4 ug/m3` (plausible nominal range)
3. Click **Submit & Anchor Reading**.
4. The system validates the bounds, computes the canonical SHA-256 digest, anchors it to the Hardhat EVM contract, and navigates directly to the observation detail view showing `CONFIRMED` on-chain status with its mined transaction hash and block number.

### Flow C: Anomaly Review — Explainable Heuristic Rule Screening
1. Return to **Submit Reading** (`/submit`).
2. Click **Load Spike Preset**. This populates:
   - Sensor ID: `AQ-Citizen-NCR-Zone2-09`
   - PM2.5: `284.6 ug/m3` (sudden jump from historical baseline of 32.0 ug/m3)
3. Click **Submit & Anchor Reading**.
4. The system accepts the reading (within physical limits) but flags it as `HIGH` severity anomaly with the explainable rule:
   - `RULE: RAPID_RATE_OF_CHANGE_SPIKE`
   - `Delta: +252.6 ug/m3 (+25.26 ug/m3/min) exceeding 30 ug/m3/min threshold`.
5. The observation lifecycle transitions to `FLAGGED` and enters the reviewer triage queue.

### Flow D: Human Decision — Accountable Reviewer Triage
1. Navigate to **Reviewer Workspace** (`/reviewer/queue`).
2. Notice the reviewer identity badge: `Actor: reviewer:officer-auth0|certified (Prototype Session)`.
3. Select the flagged reading from the queue. Review the anomaly evidence and spatial-temporal graphs.
4. Select **Approve** or **Recalibrate**.
5. Attempt to submit with an empty reason: the validation gate rejects submissions with `< 10` characters.
6. Enter an accountable justification: `"Baseline verified against co-located federal monitoring station Anand Vihar."`
7. Click **Record & Anchor Decision**.
8. The decision is anchored to `SensorTrustProvenance.sol`, mined in a new EVM block, and appended to the observation's immutable review history.

### Flow E: Provenance Explorer — Cryptographic Verification & Tamper Detection
1. Navigate to **Provenance Explorer** (`/provenance`).
2. Select any anchored observation. Click **Verify Digest**.
3. Result: **Match Confirmed** (`ON_CHAIN_CONFIRMED`).
   - Candidate payload produces the identical SHA-256 digest as recorded on-chain.
4. Now alter the candidate JSON: change `"value": 24.2` to `"value": 94.2`.
5. Click **Verify Digest**.
6. Result: **Cryptographic Tampering Detected** (`DIGEST_MISMATCH`).
   - Highlights the exact mismatch between the recomputed digest and the immutable on-chain digest, demonstrating the SHA-256 avalanche effect.

### Flow F: On-chain Proof — Contract-Level Verification
1. Click **Verify On-Chain (EVM)** on the details or provenance view.
2. The backend performs a direct, read-only `eth_call` to `verifyObservationDigest` on the deployed smart contract.
3. The UI presents the raw, authentic receipt evidence:
   - Smart Contract Address
   - EVM Chain ID (`31337`)
   - Mined Block Number & Block Timestamp
   - Relayer Submitter Address
   - Verified On-Chain Digest

---

## 7. Reliability, Recovery & State Management

### Local Hardhat Node Ephemerality vs SQLite Persistence
- **SQLite Database (`backend/sensortrust.db`):** All observations, review decisions, validation outcomes, and transaction audit trails persist indefinitely across backend restarts.
- **Local Hardhat Node (`127.0.0.1:8545`):** By default, Hardhat runs an in-memory blockchain that resets if the node process is terminated.
- **Automatic Recovery:**
  If the Hardhat node is restarted:
  1. The backend automatically redeploys `SensorTrustProvenance.sol` on the fresh node.
  2. The new contract address is persisted to `backend/artifacts/deployed_address.json`.
  3. New observations and reviews anchor seamlessly to the new contract address.
  4. The platform distinguishes previously anchored records from new ones without crashing.

### Deterministic Seed Reset
If you wish to return the platform to its pristine 5 demo scenarios:
```powershell
# Send a POST request to the safe seed reset endpoint:
curl -X POST http://127.0.0.1:8000/api/v1/seed/reset
```
*Safety Guard:* This resets observations and reviews to pristine baseline demo fixtures while **preserving the `blockchain_transactions` audit table** for historical transparency.

---

## 8. Verification Levels & Integrity Tiers

SensorTrust enforces strict cryptographic honesty. It clearly distinguishes off-chain database consistency from on-chain EVM anchoring:

| Status | Verification Level | Meaning |
| :--- | :--- | :--- |
| `VERIFIED_ON_CHAIN` | `ON_CHAIN_CONFIRMED` | Cryptographic match confirmed directly on the deployed Solidity smart contract via JSON-RPC `eth_call`. |
| `DIGEST_MISMATCH` | `ON_CHAIN_CONFIRMED` | Record exists on-chain, but the candidate payload has been altered (avalanche effect detected). |
| `NOT_ANCHORED` | `BACKEND_VERIFIED` | Payload matches database SHA-256 hash, but has not yet been submitted to or mined by the EVM contract. |
| `CHAIN_UNAVAILABLE` | `BACKEND_VERIFIED` | Database integrity verified (RFC 8785); the EVM node is offline or unreachable. |
| `TRANSACTION_FAILED` | `BACKEND_VERIFIED` | Transaction was submitted but reverted by EVM execution rules (e.g. duplicate observation with altered digest). |

> [!NOTE]  
> Database verification (`BACKEND_VERIFIED`) proves off-chain database consistency. It is **never** conflated with proof of on-chain blockchain anchoring.

---

## 9. Running the Automated Test Suites

SensorTrust includes complete automated test coverage across all layers of the stack:

### 1. Backend Pytest Suite (49 Tests)
```powershell
python -m pytest backend/tests -v
```
- **11 Failure Scenario Tests (`backend/tests/test_failure_scenarios.py`):**
  1. Node unavailable during startup (fail-closed, reports `CHAIN_UNAVAILABLE`).
  2. RPC disconnect during anchoring request (returns `TRANSACTION_FAILED`, no fake tx).
  3. Invalid or mismatched chain ID (chain ID mismatch detected and rejected).
  4. Missing or invalid contract address handled safely without server crash.
  5. Invalid PM2.5 range values ($<0$ or $>1000$) and stale timestamps rejected with 422.
  6. Duplicate observation IDs and duplicate sensor/timestamp collisions rejected with 409.
  7. Duplicate anchoring requests are safe and idempotent.
  8. EVM revert handling and persistent transaction failure diagnostics.
  9. Altered candidate payload and mismatched digest detection.
  10. Repeated review decisions with preserved historical records and supersedes pointers.
  11. Seed reset preserving transaction audit logs.
- **14 Blockchain Contract Tests (`backend/tests/test_blockchain.py`):** Compilation, deployment, observation anchoring, review decision anchoring, on-chain digest matching, altered digest failure, unknown digest rejection, chain ID validation, RPC unavailability fail-closed, duplicate request idempotency, database retry persistence, and zero private keys in responses.
- **24 Core & Domain Tests:** RFC 8785 canonicalization test vectors, validation physical bounds gates, explainable anomaly screening, and persistence across database reconnects.

### 2. Frontend Unit & API Integration Tests (12 Tests)
```powershell
npx tsx --test src/core/logic.test.ts src/services/api.test.ts
```
Validates deterministic TypeScript canonicalization, range gates, anomaly screening, and live HTTP communication with the backend.

### 3. Frontend Typechecking & Production Build
```powershell
npm run lint
npm run build
```
Validates zero TypeScript errors and compiles production bundle cleanly with Vite.

### 4. Playwright End-to-End Acceptance Tests (8 Tests)
```powershell
npx playwright test tests/e2e/frontend.spec.ts
```
Validates all primary operational screens: Dashboard KPIs, physical bounds form validation, spike anomaly detection, duplicate conflict handling, reviewer justification enforcement, and provenance tamper-verification.

---

## 10. Real Local Transaction Verification Proof

Below is an authentic transaction and on-chain verification record executed against the deployed smart contract during the verification run:

### Mined Observation Ingestion Receipt:
```json
{
  "observationId": "urn:uuid:phase5-live-obs-1792957053",
  "observationDigest": "0x7f418548c7baf4dc46131d149c77c47fba65966f2a6364f4c67e0e64c4dab665",
  "status": "APPROVED",
  "provenance": {
    "contractAddress": "0xD84379CEae14AA33C123Af12424A37803F885889",
    "networkId": "hardhat-31337",
    "txHash": "0x5403bc97c49fa6da45a2c783ad6bb8729caea354eff85a9a79ce53680028486c",
    "blockNumber": 106,
    "blockTimestamp": "2026-10-25T19:38:26+00:00",
    "anchoredBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "status": "CONFIRMED",
    "verificationUrl": "#local-hardhat-block-106"
  }
}
```

### Direct Smart Contract `eth_call` Verification:
```json
{
  "isMatched": true,
  "existsOnChain": true,
  "recomputedDigest": "0x7f418548c7baf4dc46131d149c77c47fba65966f2a6364f4c67e0e64c4dab665",
  "onChainDigest": "0x7f418548c7baf4dc46131d149c77c47fba65966f2a6364f4c67e0e64c4dab665",
  "blockNumber": 106,
  "blockTimestamp": "2026-10-25T19:38:26+00:00",
  "submitter": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "verificationLevel": "ON_CHAIN_CONFIRMED",
  "onChainStatus": "VERIFIED_ON_CHAIN",
  "explanation": "Cryptographic match verified directly on EVM smart contract! The candidate payload produces the exact SHA-256 digest anchored in the deployed contract."
}
```

### Appended Review Decision Receipt:
```json
{
  "decisionId": "urn:uuid:dec-a50d40b-1792957053",
  "observationId": "urn:uuid:phase5-live-obs-1792957053",
  "decision": "APPROVE",
  "reason": "Baseline reference sensor validated against co-located federal monitoring station.",
  "blockchainTx": {
    "txHash": "0x4464a6bac09e46829d6a7bc729a786f04dd7b164e1dca2f4e98af258b5251c8c",
    "blockNumber": 107,
    "blockTimestamp": "2026-10-25T19:38:27+00:00",
    "contractAddress": "0xD84379CEae14AA33C123Af12424A37803F885889",
    "status": "CONFIRMED"
  }
}
```

---

## 11. Known Limitations & Production Requirements

1. **Local EVM Development vs. Public Production Network:**  
   The transactions demonstrated here run against a local Hardhat EVM (Chain ID 31337). For production deployment, the contract can be deployed to an Ethereum L2 (e.g. Arbitrum One, Optimism, or Base) or climate-focused chain without any contract bytecode modifications.
2. **Relayer Private Key Management:**  
   In local development, the backend relayer uses Hardhat Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`). In production, this must be managed via an AWS KMS, GCP Cloud KMS, or HashiCorp Vault signer. Neither the client-side UI nor API endpoints ever expose private keys.
3. **Reviewer Identity Authentication:**  
   The current implementation uses a prototype certified reviewer session (`reviewer:officer-auth0|certified (Prototype Session)`). Production deployments should bind this to an OIDC / Auth0 / SAML identity provider with role-based access control (RBAC).
4. **High-Frequency Stream Scaling:**  
   Individual transaction anchoring is optimal for municipal checkpoints and human triage decisions. For high-volume IoT networks ($>10,000\ \text{readings/minute}$), future phases should aggregate observations into hourly Merkle trees and anchor the Merkle root on-chain.
5. **Privacy Preservation:**  
   To prevent leaking exact domestic sensor locations, geographical coordinates are quantized to a $0.01^\circ$ grid cell ($\approx 1.1\ \text{km}$ resolution). Exact GPS coordinates are never stored in the database or anchored to the blockchain.
