import React from 'react';

export type TabKey =
  | 'executive'
  | 'architecture'
  | 'contract'
  | 'api'
  | 'ai'
  | 'smartcontract'
  | 'frontend'
  | 'handoff'
  | 'markdown';

interface TabItem {
  id: TabKey;
  label: string;
  icon: string;
  badge?: string;
}

const TABS: TabItem[] = [
  { id: 'executive', label: 'Executive Blueprint', icon: 'verified' },
  { id: 'architecture', label: 'System Architecture', icon: 'account_tree' },
  { id: 'contract', label: 'Data Contract & Hasher', icon: 'data_object', badge: 'Interactive' },
  { id: 'api', label: 'API Specifications', icon: 'api' },
  { id: 'ai', label: 'AI Anomaly Engine', icon: 'psychology' },
  { id: 'smartcontract', label: 'Smart Contract & Security', icon: 'security' },
  { id: 'frontend', label: 'Frontend Design Spec', icon: 'web' },
  { id: 'handoff', label: 'Handoff & Roadmaps', icon: 'checklist', badge: 'Checklists' },
  { id: 'markdown', label: 'Full Markdown Spec', icon: 'description' }
];

interface TabNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-[57px] z-40 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 py-1.5 min-w-max">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
