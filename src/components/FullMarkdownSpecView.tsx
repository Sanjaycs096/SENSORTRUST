import React, { useState } from 'react';

export const FullMarkdownSpecView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const fullMarkdownPath = '/docs/SENSORTRUST_PHASE1_SPECIFICATION.md';

  const handleCopy = () => {
    // Read or copy the key sections
    const content = `# SENSORTRUST — PHASE 1 MASTER SPECIFICATION
(Complete document located at /docs/SENSORTRUST_PHASE1_SPECIFICATION.md)
Refer to the filesystem at /docs/SENSORTRUST_PHASE1_SPECIFICATION.md for the complete authoritative 16-section blueprint.`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">description</span>
            Master Specification Document
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Complete, authoritative markdown blueprint saved at <code className="text-emerald-300 font-mono">{fullMarkdownPath}</code>.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium transition self-start sm:self-auto shadow-md"
        >
          <span className="material-symbols-outlined text-sm">content_copy</span>
          <span>{copied ? 'Copied Path & Notice' : 'Copy Spec Path'}</span>
        </button>
      </div>

      {/* Structured Sections Index */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
          Complete Deliverables Index in `/docs/SENSORTRUST_PHASE1_SPECIFICATION.md`
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">1. Executive Architecture Summary</span>
            <p className="text-slate-400 text-[11px]">Mission, positioning, and the 8 Core Architectural Principles.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">2. System Architecture &amp; Mermaid Diagram</span>
            <p className="text-slate-400 text-[11px]">Layered subsystem topology: Client, Gateway, Logic, DB, Blockchain.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">3. Module Responsibility Matrix</span>
            <p className="text-slate-400 text-[11px]">Role, execution runtime, and negative invariants for all 6 modules.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">4. Technology &amp; Dependency Decisions</span>
            <p className="text-slate-400 text-[11px]">Vite, React 19, Tailwind, Material Symbols, RFC 8785, Solidity.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">5. Canonical Observation Data Contract</span>
            <p className="text-slate-400 text-[11px]">PM2.5 schema, RFC 8785 canonical serializer, and status state machine.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">6. API Contract Table &amp; JSON Payloads</span>
            <p className="text-slate-400 text-[11px]">All 8 REST endpoints with request/response envelopes and error codes.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">7. AI / Data-Quality Design &amp; Evaluation</span>
            <p className="text-slate-400 text-[11px]">Heuristic rules, Isolation Forest spec, and confusion matrix targets.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">8. Smart Contract &amp; Security Boundaries</span>
            <p className="text-slate-400 text-[11px]">`SensorTrustProvenance.sol` code, RBAC roles, and on/off-chain matrix.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">9. Frontend Sitemap &amp; Wireframes</span>
            <p className="text-slate-400 text-[11px]">Screen-by-screen breakdown of all 5 requested application views.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">10. End-to-End Workflow Sequence Diagram</span>
            <p className="text-slate-400 text-[11px]">Chronological lifecycle from sensor ingress to public verification.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">11. Recommended Repository Structure</span>
            <p className="text-slate-400 text-[11px]">Monorepo folder layout for frontend, backend, contracts, and tests.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">12. Security, Privacy &amp; Failure Handling</span>
            <p className="text-slate-400 text-[11px]">GPS truncation, zero on-chain PII, and offline node degradation.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">13. Testing Strategy &amp; Acceptance Criteria</span>
            <p className="text-slate-400 text-[11px]">Node.js logic unit tests, Hardhat contract tests, and Playwright E2E.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">14. Scope &amp; Deadline Management</span>
            <p className="text-slate-400 text-[11px]">Strict P0 vs P1 prioritization for October 25, 2026 hackathon target.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">15. Phase 2 AI Studio Handoff Checklist</span>
            <p className="text-slate-400 text-[11px]">Concrete engineering gates for frontend component generation.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">16. Phases 3–6 Antigravity Handoff Checklist</span>
            <p className="text-slate-400 text-[11px]">Implementation guidance for FastAPI, Hardhat, and Playwright suites.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
