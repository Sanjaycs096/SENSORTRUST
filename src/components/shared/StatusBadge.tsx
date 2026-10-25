import React from 'react';
import { ObservationStatus, AnomalySeverity } from '../../core/contracts.ts';

interface StatusBadgeProps {
  status: ObservationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case ObservationStatus.APPROVED:
    case ObservationStatus.ANCHORED:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[14px] text-emerald-700">check_circle</span>
          <span>{status === ObservationStatus.ANCHORED ? 'Anchored' : 'Approved'}</span>
        </span>
      );

    case ObservationStatus.FLAGGED:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-50 text-amber-950 border border-amber-300 shadow-2xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[14px] text-amber-700">flag</span>
          <span>Flagged</span>
        </span>
      );

    case ObservationStatus.PENDING_REVIEW:
    case ObservationStatus.ANCHORING_PENDING:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-sky-50 text-sky-950 border border-sky-300 shadow-2xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[14px] text-sky-700">hourglass_top</span>
          <span>{status === ObservationStatus.ANCHORING_PENDING ? 'Anchoring Pending' : 'Pending Review'}</span>
        </span>
      );

    case ObservationStatus.REJECTED:
    case ObservationStatus.INVALID:
    case ObservationStatus.ANCHORING_FAILED:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-rose-50 text-rose-950 border border-rose-300 shadow-2xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[14px] text-rose-700">cancel</span>
          <span>
            {status === ObservationStatus.INVALID
              ? 'Invalid'
              : status === ObservationStatus.ANCHORING_FAILED
              ? 'Anchoring Failed'
              : 'Rejected'}
          </span>
        </span>
      );

    case ObservationStatus.RECALIBRATION_REQUESTED:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-purple-50 text-purple-950 border border-purple-300 shadow-2xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[14px] text-purple-700">build_circle</span>
          <span>Recalibration Req.</span>
        </span>
      );

    case ObservationStatus.SUBMITTED:
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-stone-100 text-stone-800 border border-stone-300 shadow-2xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[14px] text-stone-600">pending</span>
          <span>Submitted</span>
        </span>
      );
  }
};

export const SeverityBadge: React.FC<{ severity: AnomalySeverity }> = ({ severity }) => {
  switch (severity) {
    case AnomalySeverity.CRITICAL:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-900 border border-rose-300">
          <span className="material-symbols-outlined text-xs text-rose-700">crisis_alert</span>
          <span>Critical Risk</span>
        </span>
      );
    case AnomalySeverity.HIGH:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-950 border border-orange-300">
          <span className="material-symbols-outlined text-xs text-orange-700">warning</span>
          <span>High Risk</span>
        </span>
      );
    case AnomalySeverity.MEDIUM:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-950 border border-amber-300">
          <span className="material-symbols-outlined text-xs text-amber-700">info</span>
          <span>Medium Risk</span>
        </span>
      );
    case AnomalySeverity.LOW:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-300">
          <span className="material-symbols-outlined text-xs text-blue-700">remove</span>
          <span>Low Risk</span>
        </span>
      );
    case AnomalySeverity.NORMAL:
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300">
          <span className="material-symbols-outlined text-xs text-emerald-700">check</span>
          <span>Nominal</span>
        </span>
      );
  }
};
