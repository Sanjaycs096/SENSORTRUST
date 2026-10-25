# SensorTrust — Demo Recording & Production Checklist
**Event:** IEEE ClimateChain Global Hackathon 2026 — Track D  
**Target Output:** 3-Minute MP4 Video (1080p, 30/60 fps) + High-Resolution Screenshot Gallery

---

## 1. Pre-Recording Environment Setup

Before recording, ensure your local Windows workstation is properly prepared:

### Step 1.1: Start Services in Dedicated PowerShell Terminals

| Terminal | Service | Command | Health Verification |
| :--- | :--- | :--- | :--- |
| **Terminal 1** | Local Hardhat EVM | `npx hardhat --config hardhat.config.cjs node --port 8545` | Returns `HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/` (Chain ID 31337) |
| **Terminal 2** | FastAPI Backend | `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` | Open `http://127.0.0.1:8000/api/v1/health` in browser: `status: HEALTHY` |
| **Terminal 3** | Vite Frontend | `npm run dev` | Open `http://localhost:3000`: Dashboard loads cleanly |

### Step 1.2: Reset Database to Clean State (Optional but Recommended)
To start with pristine baseline demo scenarios before recording:
```powershell
# In PowerShell:
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/v1/seed/reset"
```
*Expected response:* `{"status": "SUCCESS", "message": "Successfully reset database to 5 baseline demo records."}`

### Step 1.3: Run Automated Workflow Check
```powershell
python backend/verify_workflow.py
```
*Must end with:* `ALL COMPLETE LOCAL-CHAIN WORKFLOW STEPS PASSED WITH 100% SUCCESS!`

---

## 2. Screen & Audio Recording Configuration

- **Display Resolution:** Set display resolution to **1920x1080** (1080p).
- **Browser Zoom:** Set Google Chrome / Microsoft Edge zoom to **100%** or **110%** for optimal typography readability.
- **Full Screen:** Hide browser bookmark bar (`Ctrl + Shift + B`), tab clutter, and personal extensions.
- **Desktop Clutter:** Hide desktop icons and close taskbar applications (Discord, Slack, Spotify).
- **Notifications:** Turn on Windows **Focus Assist / Do Not Disturb** (`Win + N` -> Focus Assist On).
- **Microphone:** Use a dedicated headset or condenser mic. Speak at a measured pace (~140 words/min) with energy and clarity.
- **Recording Software:** OBS Studio or Windows Xbox Game Bar (`Win + G` / `Win + Alt + R`).
  - Bitrate: 8,000–12,000 kbps.
  - Audio: 48 kHz, stereo.

---

## 3. Step-by-Step Order of Actions During Recording

Follow this precise sequence matching [DEMO_SCRIPT.md](file:///c:/Users/sanja/project/CONTEST/DEVPOST/sensortrust/docs/DEMO_SCRIPT.md):

1. **Dashboard (`/`) [0:00 - 0:30]:**
   - Introduce project name and tagline: *"Trust the Data. Verify the History."*
   - Scroll down through the 5 pre-seeded observations.
   - Point out status badges: `APPROVED` (Green), `FLAGGED` (Amber), `PENDING_REVIEW` (Purple).
2. **Submit Plausible Reading (`/submit`) [0:30 - 1:00]:**
   - Click **Submit Observation** in sidebar.
   - Click **Load Nominal Preset**. Point out PM2.5 = `22.4 µg/m³` and $0.01^\circ$ grid cell coordinates.
   - Click **Submit & Anchor Reading**.
   - Show instant redirect to Details page with `APPROVED` and `CONFIRMED` on-chain status.
3. **Submit Anomaly Reading (`/submit`) [1:00 - 1:40]:**
   - Navigate back to **Submit Observation**.
   - Click **Load Spike Preset**. Point out PM2.5 = `284.6 µg/m³`.
   - Click **Submit & Anchor Reading**.
   - Show the **Anomaly Screening Assessment** card on Details page highlighting `RULE: RAPID_RATE_OF_CHANGE_SPIKE`.
4. **Reviewer Workspace (`/reviewer/queue`) [1:40 - 2:15]:**
   - Navigate to **Reviewer Workspace** in sidebar.
   - Point out prototype actor badge: `Actor: reviewer:officer-auth0|certified (Prototype Session)`.
   - Select the spike reading from the queue.
   - Click **Approve**.
   - Type reason: `"Baseline verified against co-located Anand Vihar BAM station."` (Note character counter).
   - Click **Record & Anchor Decision**. Show green confirmation banner with tx hash and block number.
5. **Provenance Explorer (`/provenance`) [2:15 - 2:45]:**
   - Navigate to **Provenance Explorer**.
   - Select an observation and click **Verify Digest** -> show green `ON_CHAIN_CONFIRMED` badge.
   - In the JSON editor, change `"value": 24.2` to `"value": 94.2`.
   - Click **Verify Digest** -> show red `DIGEST_MISMATCH` badge catching SHA-256 hash divergence.
6. **On-Chain EVM Query [2:45 - 3:00]:**
   - Show the authentic JSON-RPC receipt details (Contract address, Chain ID 31337, block number).
   - Deliver concise closing statement.

---

## 4. Troubleshooting & Fault Recovery

| Symptom | Cause | Rapid Fix |
| :--- | :--- | :--- |
| **"Cannot connect to EVM RPC node"** | Hardhat node was stopped | Restart Terminal 1: `npx hardhat --config hardhat.config.cjs node --port 8545`. Backend will auto-reconnect. |
| **"Contract does not exist"** | Hardhat node restarted, resetting in-memory EVM | Send POST request to redeploy: `curl -X POST http://127.0.0.1:8000/api/v1/blockchain/deploy` |
| **Submission returns 409 Conflict** | Reusing same observation ID or timestep | Click **Load Nominal Preset** again to generate a new random UUID. |
| **Review button disabled** | Reason is fewer than 10 characters | Type at least 10 characters in the justification field. |
| **Frontend displays white screen** | Vite dev server crashed | Restart Terminal 3: `npm run dev`. |

---

## 5. Backup Screenshot Gallery Checklist

In addition to video recording, capture 6 high-resolution (1080p) screenshots for the Devpost gallery:

- [ ] **Screenshot 1 — Dashboard (`/`):** Full view showing metrics cards, Sample Data Notice, and observation stream.
- [ ] **Screenshot 2 — Plausible Reading Submission (`/submit`):** Form populated with nominal reading, showing physical range guidance ($0.0 \le \text{PM2.5} \le 1000.0\ \mu\text{g/m}^3$).
- [ ] **Screenshot 3 — Anomaly Details (`/observations/:id`):** Details view of a flagged reading showing the explainable anomaly breakdown, delta rate-of-change evidence, and missing neighbor context.
- [ ] **Screenshot 4 — Reviewer Workspace (`/reviewer/queue`):** Triage queue showing decision options, character-count gate, and prototype reviewer identity badge.
- [ ] **Screenshot 5 — Provenance Explorer Untampered (`/provenance`):** Showing green `ON_CHAIN_CONFIRMED` badge and identical SHA-256 hash match.
- [ ] **Screenshot 6 — Provenance Explorer Tampered (`/provenance`):** Showing red `DIGEST_MISMATCH` banner highlighting cryptographic avalanche detection on altered payload.

---

## 6. Final Video Review Before Submission

- [ ] Video playback is smooth with zero stutter or dropped frames.
- [ ] Audio volume is consistent, no background hum or keyboard clicks.
- [ ] Spoken duration is between **2:45 and 3:15**.
- [ ] No personal information, API keys, or private terminal logs were captured.
- [ ] Video uploaded to YouTube (Unlisted or Public) or Vimeo, with link tested in an Incognito browser window.
