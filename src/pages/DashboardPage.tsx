import React, { useState, useEffect, useMemo } from 'react';
import { sensorTrustApi } from '../services/api.ts';
import {
  EnrichedObservation,
  MetricsSummaryResponse,
  ObservationStatus
} from '../core/contracts.ts';
import { MetricCard } from '../components/shared/MetricCard.tsx';
import { StatusBadge, SeverityBadge } from '../components/shared/StatusBadge.tsx';
import { SampleDataNotice } from '../components/shared/SampleDataNotice.tsx';
import { PageHeader } from '../components/shared/PageHeader.tsx';
import { CopyDigest } from '../components/shared/CopyDigest.tsx';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<MetricsSummaryResponse | null>(null);
  const [allObservations, setAllObservations] = useState<EnrichedObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ObservationStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, obsRes] = await Promise.all([
        sensorTrustApi.getMetrics(),
        sensorTrustApi.getObservations({ limit: 50 })
      ]);
      setMetrics(m);
      setAllObservations(obsRes.items);
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute category counts for filter buttons
  const counts = useMemo(() => {
    const total = allObservations.length;
    const approved = allObservations.filter(
      (o) => o.status === ObservationStatus.APPROVED || o.status === ObservationStatus.ANCHORED
    ).length;
    const flagged = allObservations.filter((o) => o.status === ObservationStatus.FLAGGED).length;
    const pending = allObservations.filter(
      (o) =>
        o.status === ObservationStatus.PENDING_REVIEW ||
        o.status === ObservationStatus.ANCHORING_PENDING
    ).length;
    const rejected = allObservations.filter((o) => o.status === ObservationStatus.REJECTED).length;

    return { total, approved, flagged, pending, rejected };
  }, [allObservations]);

  // Client-side filtering & searching
  const filteredObservations = useMemo(() => {
    let list = allObservations;

    if (statusFilter !== 'ALL') {
      if (statusFilter === ObservationStatus.APPROVED) {
        list = list.filter(
          (o) => o.status === ObservationStatus.APPROVED || o.status === ObservationStatus.ANCHORED
        );
      } else {
        list = list.filter((o) => o.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.observation.sensorId.toLowerCase().includes(q) ||
          o.observation.location.zoneId.toLowerCase().includes(q) ||
          o.observation.observationId.toLowerCase().includes(q) ||
          o.observationDigest.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allObservations, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Sample Data Disclaimer Banner */}
      <SampleDataNotice onReset={loadData} />

      {/* Page Header */}
      <PageHeader
        title="Monitoring Dashboard"
        subtitle="Real-time air-quality observations, automated anomaly screening, and immutable provenance status across monitored air basins."
        icon="dashboard"
        badge={{ text: 'PM2.5 Telemetry Stream', variant: 'emerald' }}
        actions={
          <button
            onClick={() => onNavigate('/submit')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-medium shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Submit New Reading</span>
          </button>
        }
      />

      {/* Restrained KPI Row */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total Ingested"
            value={metrics.totalObservations}
            subtext="Validated PM2.5 records"
            icon="analytics"
            colorTheme="stone"
          />
          <MetricCard
            label="Flagged for Review"
            value={metrics.flaggedCount}
            subtext="Anomalous readings in queue"
            icon="flag"
            colorTheme="amber"
          />
          <MetricCard
            label="Simulated Anchors"
            value={metrics.anchoredCount}
            subtext="Simulated EVM (31337) records"
            icon="token"
            colorTheme="emerald"
          />
          <MetricCard
            label="Human Rejected"
            value={metrics.rejectedCount}
            subtext="Accountable audit decisions"
            icon="cancel"
            colorTheme="rose"
          />
        </div>
      )}

      {/* Observations Stream Section */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        {/* Table Filter & Search Controls */}
        <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-stone-50/70">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider font-mono mr-1">
              Filter:
            </span>
            {[
              { id: 'ALL' as const, label: 'All Records', count: counts.total },
              { id: ObservationStatus.APPROVED, label: 'Approved', count: counts.approved },
              { id: ObservationStatus.FLAGGED, label: 'Flagged', count: counts.flagged },
              { id: ObservationStatus.PENDING_REVIEW, label: 'Pending Review', count: counts.pending },
              { id: ObservationStatus.REJECTED, label: 'Rejected', count: counts.rejected }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  statusFilter === tab.id
                    ? 'bg-stone-900 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold ${
                    statusFilter === tab.id
                      ? 'bg-stone-700 text-stone-100'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar with clear button */}
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-stone-400 text-lg select-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search station, basin, or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-stone-400 hover:text-stone-600 text-sm focus:outline-none"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center text-stone-500 space-y-2">
            <span className="material-symbols-outlined text-3xl animate-spin text-emerald-700">
              progress_activity
            </span>
            <p className="text-xs">Loading verified observation stream...</p>
          </div>
        ) : filteredObservations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <span className="material-symbols-outlined text-2xl">search_off</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900">No observations found</h4>
              <p className="text-xs text-stone-500 mt-0.5">
                No telemetry matches the current filter or search criteria.
              </p>
            </div>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition"
            >
              Clear Filters &amp; Search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-100/80 border-b border-stone-200 text-stone-600 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3.5 font-semibold">Station &amp; Basin</th>
                  <th scope="col" className="p-3.5 font-semibold">Measurement</th>
                  <th scope="col" className="p-3.5 font-semibold">Lifecycle Status</th>
                  <th scope="col" className="p-3.5 font-semibold">Screening Risk</th>
                  <th scope="col" className="p-3.5 font-semibold">Observed Time</th>
                  <th scope="col" className="p-3.5 font-semibold">Cryptographic Provenance</th>
                  <th scope="col" className="p-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredObservations.map((obs) => {
                  const isHigh = obs.observation.value > 100;
                  return (
                    <tr
                      key={obs.observation.observationId}
                      className="hover:bg-stone-50/80 transition cursor-pointer group"
                      onClick={() => onNavigate(`/observations/${obs.observation.observationId}`)}
                    >
                      <td className="p-3.5">
                        <div className="font-semibold text-stone-900 group-hover:text-emerald-900 transition truncate max-w-[220px]">
                          {obs.observation.sensorId}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                          <span className="truncate max-w-[120px]">{obs.observation.location.zoneId}</span>
                          <span className="text-stone-300">&bull;</span>
                          <span>
                            ({obs.observation.location.gridLat}, {obs.observation.location.gridLon})
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <span
                          className={`font-bold text-sm tabular-nums ${
                            isHigh ? 'text-amber-800 font-extrabold' : 'text-stone-900'
                          }`}
                        >
                          {obs.observation.value.toFixed(1)}
                        </span>{' '}
                        <span className="text-[11px] text-stone-500 font-sans">{obs.observation.unit}</span>
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={obs.status} size="sm" />
                      </td>

                      <td className="p-3.5">
                        <SeverityBadge severity={obs.anomaly.severity} />
                      </td>

                      <td className="p-3.5 text-stone-600 font-mono text-[11px] tabular-nums">
                        {new Date(obs.observation.timestampObserved).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono text-[11px] text-stone-700 font-semibold">
                          Block #{obs.provenance.blockNumber}
                        </div>
                        <div className="mt-0.5">
                          <CopyDigest value={obs.observationDigest} truncateLength={14} />
                        </div>
                      </td>

                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onNavigate(`/observations/${obs.observation.observationId}`)}
                          className="px-3 py-1.5 rounded-lg bg-stone-100 group-hover:bg-emerald-50 group-hover:text-emerald-900 text-stone-700 text-xs font-medium transition shadow-2xs border border-stone-200/60 inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          <span>Inspect</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
