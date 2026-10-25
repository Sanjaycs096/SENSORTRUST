import React from 'react';

interface NotFoundPageProps {
  onNavigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto my-12 shadow-2xs">
      <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto border border-stone-200">
        <span className="material-symbols-outlined text-3xl">wrong_location</span>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-stone-900 font-mono">404 — Page Not Found</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          The requested route does not exist in the SensorTrust environmental monitoring ledger.
        </p>
      </div>
      <div className="pt-2">
        <button
          onClick={() => onNavigate('/')}
          className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
