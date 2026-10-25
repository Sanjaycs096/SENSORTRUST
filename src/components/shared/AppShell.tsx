import React, { useState, useEffect } from 'react';

interface AppShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  flaggedCount?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPath,
  onNavigate,
  children,
  flaggedCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', description: 'Monitoring Overview' },
    { path: '/submit', label: 'Submit Observation', icon: 'add_circle', description: 'PM2.5 Ingestion' },
    {
      path: '/reviewer/queue',
      label: 'Reviewer Workspace',
      icon: 'rate_review',
      description: 'Accountable Review',
      badge: flaggedCount > 0 ? `${flaggedCount}` : undefined
    },
    { path: '/provenance', label: 'Provenance Explorer', icon: 'verified', description: 'Digest & Audit Verification' }
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-stone-900 text-stone-100 px-4 py-3 border-b border-stone-800 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button
          onClick={() => handleNavClick('/')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-lg">shield</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight font-mono text-white">SensorTrust</span>
              <span className="px-1 py-0.2 text-[9px] font-mono rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                v2.5
              </span>
            </div>
            <p className="text-[10px] text-stone-400">Trust the Data. Verify the History.</p>
          </div>
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-stone-300 hover:text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="material-symbols-outlined text-2xl">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Mobile Navigation Drawer with backdrop */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="md:hidden fixed top-[57px] left-0 right-0 bg-stone-900 border-b border-stone-800 px-4 py-3 space-y-1.5 z-40 shadow-xl max-h-[calc(100vh-57px)] overflow-y-auto"
            aria-label="Mobile Navigation"
          >
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-800 text-white font-semibold'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-lg ${
                        isActive ? 'text-emerald-300' : 'text-stone-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-stone-950 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Desktop Sidebar Navigation Rail */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-stone-900 border-r border-stone-800 shrink-0 text-stone-200 justify-between sticky top-0 h-screen select-none z-30">
        <div className="p-5 space-y-6">
          {/* Brand Header */}
          <button
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-3 text-left w-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1 -m-1 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 flex items-center justify-center text-white shadow-xs transition">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white font-mono">SensorTrust</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-semibold">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                Trust the Data. Verify the History.
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Desktop Navigation">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-400 px-3 pb-1">
              Platform Modules
            </div>
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                      : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`material-symbols-outlined text-lg shrink-0 ${
                        isActive ? 'text-emerald-300' : 'text-stone-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] text-stone-400 truncate font-normal">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 font-mono shrink-0 shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Environmental / EVM Network Status Box */}
        <div className="p-4 border-t border-stone-800 text-[11px] text-stone-400 space-y-2.5 bg-stone-950/40">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-stone-300 font-medium font-mono text-[11px]">Simulated EVM (31337)</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800/50">
              Prototype Mode
            </span>
          </div>
          <div className="text-[10px] text-stone-400 leading-snug">
            IEEE ClimateChain 2026 &bull; Scope: PM2.5 (0..1000 µg/m³)
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        <footer className="border-t border-stone-200 bg-white py-4 px-6 text-xs text-stone-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-900 font-mono">SensorTrust</span>
              <span>&bull;</span>
              <span>Environmental Data Integrity &amp; Provenance</span>
            </div>
            <div className="text-stone-400 text-[11px] font-mono">
              Phase 2 Frontend Prototype &bull; Antigravity Integration Ready
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
