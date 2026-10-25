# SensorTrust — 3-Minute Video Demonstration Script
**Project:** SensorTrust — Environmental Data Integrity & Provenance Platform  
**Hackathon:** IEEE ClimateChain Global Hackathon 2026 — Track D: Climate Data & Environmental Monitoring  
**Tagline:** Trust the Data. Verify the History.  
**Target Video Duration:** ~3 minutes (180 seconds)  
**Presenter Tone:** Professional, articulate, clear, and focused on environmental data accountability.

---

## Demonstration Setup & Prerequisites

Before hitting record, ensure the three services are running locally on Windows:
1. **Hardhat Node:** `npx hardhat --config hardhat.config.cjs node --port 8545` (Chain ID 31337)
2. **FastAPI Backend:** `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
3. **Vite Frontend:** `npm run dev` (`http://localhost:3000`)
4. **Browser Window:** Chrome/Edge set to 100% zoom at `http://localhost:3000`. Clean background, notifications silenced.

---

## Scene 1: Introduction & The Environmental Trust Gap
**Timestamp:** `0:00 – 0:30` (30 seconds)  
**Page to Show:** Dashboard Overview (`/`)  
**User Action:** Cursor hovers over key metrics cards (Total Observations, Integrity Rate, Pending Triage) and scrolls smoothly through the live telemetry feed.

### Spoken Narration:
> *"Air quality monitoring networks are expanding rapidly worldwide. While low-cost optical IoT sensors give us dense neighborhood coverage, they are prone to baseline drift, unshielded placement, and silent data tampering. Official reference monitors are highly accurate, but too sparse.*
> 
> *Welcome to **SensorTrust** — an AI-assisted telemetry integrity and tamper-evident blockchain provenance platform built for municipal environmental departments, atmospheric researchers, and citizen-science networks.*
> 
> *Our motto is: **Trust the Data. Verify the History.** Let’s see how it works in real-time."*

### Visible On-Screen Result:
- Calm climate-tech dashboard loads with warm-neutral styling.
- Key metrics: Total Ingested Observations, Verification Rate (100%), Active Flagged count.
- Sample Data Notice clearly indicates pre-seeded baseline demo scenarios.

---

## Scene 2: Ingesting a Valid Observation & Physical Invariants
**Timestamp:** `0:30 – 1:00` (30 seconds)  
**Page to Show:** Submit Observation (`/submit`)  
**User Action:**
1. Click **Submit Observation** in the sidebar.
2. Click the preset button: **Load Nominal Preset**.
3. Point out PM2.5 = `22.4 µg/m³`, sensor type `LOW_COST_IOT`, and quantized coordinates ($0.01^\circ$ grid cell for privacy).
4. Click **Submit & Anchor Reading**.

### Spoken Narration:
> *"Every sensor reading submitted to SensorTrust passes through deterministic physical invariant gates before ingestion.*
> 
> *Let's submit a plausible ambient reading of 22.4 micrograms per cubic meter from an IoT station. The server enforces plausible physical bounds—rejecting negative numbers or values above 1,000—verifies clock freshness, and checks against duplicate timesteps.*
> 
> *Notice our coordinates are quantized to a 0.01-degree grid cell, safeguarding domestic sensor privacy without sacrificing localized regional context.*
> 
> *When we submit, the backend computes an RFC 8785 canonical JSON digest, validates it, and anchors it immediately to our local EVM smart contract."*

### Visible On-Screen Result:
- Instant client-side redirect to the observation details view (`/observations/:id`).
- Green `APPROVED` status badge.
- Real EVM transaction hash and mined block number displayed on the provenance card.

---

## Scene 3: Explainable Anomaly Detection & Triage Screening
**Timestamp:** `1:00 – 1:40` (40 seconds)  
**Page to Show:** Submit Observation (`/submit`) -> Details Page (`/observations/:id`)  
**User Action:**
1. Click **Submit Observation** again.
2. Click preset button: **Load Spike Preset**.
3. Point out PM2.5 = `284.6 µg/m³` (sudden jump from a 32.0 baseline).
4. Click **Submit & Anchor Reading**.
5. On the redirected details page, scroll to the **Anomaly Screening Assessment** card.

### Spoken Narration:
> *"Now let's submit an unusual reading: a sudden spike to 284.6 micrograms per cubic meter.*
> 
> *SensorTrust does not immediately label this fraud or delete it—real environmental pollution events like agricultural fires happen. Instead, our explainable screening engine flags it for human triage.*
> 
> *Here, the system explains exactly why: the rate of change surged by over 25 micrograms per minute, triggering `RULE: RAPID_RATE_OF_CHANGE_SPIKE`. The observation is assigned `HIGH` severity and routed directly to the authorized reviewer triage queue."*

### Visible On-Screen Result:
- Observation marked as `FLAGGED` (Amber badge).
- Explainable anomaly breakdown showing delta rate-of-change evidence, baseline comparisons, and missing spatial neighbor context disclosures.

---

## Scene 4: Accountable Human Review & Append-Only History
**Timestamp:** `1:40 – 2:15` (35 seconds)  
**Page to Show:** Reviewer Workspace (`/reviewer/queue`)  
**User Action:**
1. Click **Reviewer Workspace** in the sidebar.
2. Highlight the active actor badge: `Actor: reviewer:officer-auth0|certified (Prototype Session)`.
3. Select the flagged observation from the queue.
4. Select **Approve**.
5. Type an accountable reason in the textarea:  
   `"Baseline verified against co-located Anand Vihar BAM station."` (Note the character counter turns green past 10 chars).
6. Click **Record & Anchor Decision**.

### Spoken Narration:
> *"In the Reviewer Workspace, authorized environmental officers review flagged telemetry. For full transparency, we disclose that this demo uses prototype officer identities.*
> 
> *To eliminate unverified rubber-stamping, SensorTrust enforces accountability: every review verdict requires an evidence-based justification of at least 10 characters.*
> 
> *When the officer submits their approval, this decision is hashed and anchored as an immutable, append-only event on the blockchain. If a sensor later drifts and requires recalibration, the subsequent review supersedes this decision while preserving the entire historical audit trail."*

### Visible On-Screen Result:
- Green success banner: `Decision successfully recorded and anchored! Tx: 0x... (Block #...)`.
- Observation status transitions to `APPROVED`.
- Item moves out of active triage queue.

---

## Scene 5: Cryptographic Provenance Explorer & Tamper Detection
**Timestamp:** `2:15 – 2:45` (30 seconds)  
**Page to Show:** Provenance Explorer (`/provenance`)  
**User Action:**
1. Click **Provenance Explorer** in the sidebar.
2. Select any anchored observation. Click **Verify Digest**.
3. Point out the green **Match Confirmed** (`ON_CHAIN_CONFIRMED`) badge.
4. In the editable JSON viewer, tamper with the data: change `"value": 24.2` to `"value": 94.2`.
5. Click **Verify Digest**.
6. Point out the red **Cryptographic Tampering Detected** (`DIGEST_MISMATCH`) banner.

### Spoken Narration:
> *"In the Provenance Explorer, any downstream researcher or regulatory auditor can independently verify raw environmental records.*
> 
> *When we verify an authentic record, SensorTrust canonicalizes the payload using RFC 8785 and checks the SHA-256 digest against the smart contract. It confirms an exact on-chain match.*
> 
> *Now, watch what happens if a malicious actor modifies a single character—say, artificially lowering or inflating the PM2.5 value. Because SHA-256 exhibits the avalanche effect, the recomputed digest diverges completely.*
> 
> *SensorTrust instantly catches the tampering, proving the payload no longer matches the immutable on-chain record."*

### Visible On-Screen Result:
- First check: Green `ON_CHAIN_CONFIRMED` badge showing identical hex hashes.
- Tampered check: Red `DIGEST_MISMATCH` badge with split diff view highlighting the differing hashes.

---

## Scene 6: Real EVM On-Chain Proof & Closing Summary
**Timestamp:** `2:45 – 3:00` (15 seconds)  
**Page to Show:** Observation Details Page (`/observations/:id`)  
**User Action:** Click **Verify On-Chain (EVM)** on the Provenance Card, revealing the real-time JSON-RPC `eth_call` response.

### Spoken Narration:
> *"Finally, SensorTrust executes real read-only `eth_call` queries against our deployed Solidity contract on our local Hardhat node, providing authentic block numbers, gas receipts, and relayer addresses.*
> 
> *SensorTrust transforms uncalibrated environmental telemetry into verifiable, accountable public data. Trust the Data. Verify the History. Thank you."*

### Visible On-Screen Result:
- EVM receipt dialog displays authentic contract address (`0xD843...`), chain ID (`31337`), block number, gas used, and on-chain verification confirmation.
- Video ends cleanly on the platform dashboard with tagline visible.

---

## Post-Recording Review Checklist
- [ ] Total video duration is between **2:45 and 3:15**.
- [ ] No private keys or internal credentials visible on screen.
- [ ] Both Nominal and Spike presets were demonstrated.
- [ ] Tamper detection was clearly shown with a modified payload.
- [ ] Audio is crisp and speech is paced at ~140 words per minute.
