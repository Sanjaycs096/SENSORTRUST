import React, { useState } from 'react';
import { SAMPLE_API_ENDPOINTS } from '../data/mockData.ts';

export const ApiContractView: React.FC = () => {
  const [activeEndpointIndex, setActiveEndpointIndex] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  const active = SAMPLE_API_ENDPOINTS[activeEndpointIndex] || SAMPLE_API_ENDPOINTS[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">api</span>
          SensorTrust REST API Contract (v1 Specification)
        </h3>
        <p className="text-xs text-slate-400">
          Clean, versioned REST endpoints for environmental ingestion, validation screening, reviewer actions, and public hash verification.
        </p>
      </div>

      {/* Main Split: Endpoint List vs Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Endpoint List */}
        <div className="lg:col-span-5 space-y-2">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            Available Endpoints
          </div>
          {SAMPLE_API_ENDPOINTS.map((ep, idx) => {
            const isSelected = activeEndpointIndex === idx;
            const isGet = ep.method === 'GET';
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveEndpointIndex(idx);
                  setCopied(false);
                }}
                className={`w-full p-3.5 rounded-lg border text-left transition flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-950/20 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                      isGet ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <div className="truncate">
                    <div className="font-mono text-xs text-white truncate">{ep.path}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{ep.title}</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-sm text-slate-400 shrink-0">
                  chevron_right
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Endpoint Inspector */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    active.method === 'GET'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {active.method}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{active.path}</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs self-start sm:self-auto">
                Auth: {active.auth}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{active.description}</p>

            {/* Request Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Request Payload / Query</span>
                {typeof active.request === 'object' && (
                  <button
                    onClick={() => handleCopy(JSON.stringify(active.request, null, 2))}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                  >
                    <span className="material-symbols-outlined text-xs">content_copy</span>
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                )}
              </div>
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-200 overflow-x-auto max-h-48">
                {typeof active.request === 'string' ? (
                  <span className="text-slate-400 italic">{active.request}</span>
                ) : (
                  <pre>{JSON.stringify(active.request, null, 2)}</pre>
                )}
              </div>
            </div>

            {/* Success Response */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>200 / 201 Success Response</span>
                <span className="text-emerald-400 text-[11px]">JSON Envelope</span>
              </div>
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-56">
                <pre>{JSON.stringify(active.response, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
