import React, { useState } from 'react';
import { sensorTrustApi } from '../services/api.ts';
import {
  ObservationPayload,
  SensorType,
  CalibrationStatus
} from '../core/contracts.ts';
import { SampleDataNotice } from '../components/shared/SampleDataNotice.tsx';
import { PageHeader } from '../components/shared/PageHeader.tsx';

interface SubmitPageProps {
  onNavigate: (path: string) => void;
}

export const SubmitPage: React.FC<SubmitPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState<Partial<ObservationPayload>>({
    observationId: `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : 'obs-' + Math.random().toString(36).substring(2, 10)}`,
    sensorId: 'AQ-Sensor-CityCenter-01',
    pollutant: 'PM2.5',
    value: 38.5,
    unit: 'ug/m3',
    timestampObserved: new Date().toISOString(),
    location: {
      gridLat: 28.61,
      gridLon: 77.20,
      countryCode: 'IN',
      zoneId: 'delhi-ncr-zone1'
    },
    sensorMetadata: {
      sensorType: SensorType.LOW_COST_IOT,
      calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED,
      firmwareVersion: 'v2.4.0'
    }
  });

  const [inlineErrors, setInlineErrors] = useState<string[]>([]);
  const [duplicateConflictError, setDuplicateConflictError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setInlineErrors([]);
    setDuplicateConflictError(null);

    if (field.startsWith('location.')) {
      const locKey = field.replace('location.', '');
      setFormData((prev) => ({
        ...prev,
        location: {
          ...(prev.location || { gridLat: 0, gridLon: 0, countryCode: 'IN', zoneId: '' }),
          [locKey]: value
        }
      }));
    } else if (field.startsWith('sensorMetadata.')) {
      const metaKey = field.replace('sensorMetadata.', '');
      setFormData((prev) => ({
        ...prev,
        sensorMetadata: {
          ...(prev.sensorMetadata || {
            sensorType: SensorType.LOW_COST_IOT,
            calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED
          }),
          [metaKey]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLoadSpikePreset = () => {
    setInlineErrors([]);
    setDuplicateConflictError(null);
    setFormData({
      observationId: `urn:uuid:${Math.random().toString(36).substring(2, 10)}-spike-demo`,
      sensorId: 'AQ-Citizen-NCR-Zone2-09',
      pollutant: 'PM2.5',
      value: 284.6, // Suspicious sharp spike from 32.0 baseline
      unit: 'ug/m3',
      timestampObserved: new Date().toISOString(),
      location: {
        gridLat: 28.62,
        gridLon: 77.21,
        countryCode: 'IN',
        zoneId: 'delhi-ncr-zone2'
      },
      sensorMetadata: {
        sensorType: SensorType.CITIZEN_SCIENCE,
        calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED,
        firmwareVersion: 'Plantower-PMS5003-v1.8'
      }
    });
  };

  const handleLoadNegativeInvalidPreset = () => {
    setInlineErrors([]);
    setDuplicateConflictError(null);
    setFormData({
      observationId: `urn:uuid:${Math.random().toString(36).substring(2, 10)}-invalid-negative`,
      sensorId: 'Sensor-Faulty-Test-01',
      pollutant: 'PM2.5',
      value: -15.4, // Physically impossible negative PM2.5
      unit: 'ug/m3',
      timestampObserved: new Date().toISOString(),
      location: {
        gridLat: 28.60,
        gridLon: 77.20,
        countryCode: 'IN',
        zoneId: 'delhi-ncr-zone1'
      },
      sensorMetadata: {
        sensorType: SensorType.LOW_COST_IOT,
        calibrationStatus: CalibrationStatus.UNKNOWN
      }
    });
  };

  const handleLoadNominalPreset = () => {
    setInlineErrors([]);
    setDuplicateConflictError(null);
    setFormData({
      observationId: `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10)}`,
      sensorId: 'AQ-Sensor-Nominal-22',
      pollutant: 'PM2.5',
      value: 22.4,
      unit: 'ug/m3',
      timestampObserved: new Date().toISOString(),
      location: {
        gridLat: 51.51,
        gridLon: -0.12,
        countryCode: 'GB',
        zoneId: 'greater-london-urban'
      },
      sensorMetadata: {
        sensorType: SensorType.LOW_COST_IOT,
        calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED,
        firmwareVersion: 'Sensirion-SPS30-v2.1'
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineErrors([]);
    setDuplicateConflictError(null);
    setSubmitting(true);

    try {
      const submissionPayload: Partial<ObservationPayload> = {
        ...formData,
        timestampSubmitted: new Date().toISOString()
      };

      const result = await sensorTrustApi.submitObservation(submissionPayload);

      if (!result.validation.isValid) {
        setInlineErrors(result.validation.rejectionReasons);
        if (result.validation.checks.duplicateDetected) {
          setDuplicateConflictError(
            'Conflict: Observation with identical ID or sensor timestep already recorded in registry.'
          );
        }
        return;
      }

      // Success -> navigate to observation details view
      onNavigate(`/observations/${result.observationId}`);
    } catch (err: any) {
      setInlineErrors([err.message || 'An unexpected error occurred during submission.']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SampleDataNotice />

      {/* Page Header */}
      <PageHeader
        title="Submit PM2.5 Observation"
        subtitle="Ingest atmospheric telemetry for deterministic physical validation and explainable anomaly screening."
        icon="add_circle"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => onNavigate('/') },
          { label: 'Submit Observation' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadNominalPreset}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-medium border border-emerald-300 transition"
              title="Load nominal PM2.5 reading (22.4 µg/m³)"
            >
              Load Nominal
            </button>
            <button
              type="button"
              onClick={handleLoadSpikePreset}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-medium border border-amber-300 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm text-amber-700">bolt</span>
              <span>Load Spike Sample</span>
            </button>
            <button
              type="button"
              onClick={handleLoadNegativeInvalidPreset}
              className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 transition"
              title="Load negative value to verify physical bound rejection"
            >
              Load Invalid
            </button>
          </div>
        }
      />

      {/* Physical Validation Errors Banner */}
      {inlineErrors.length > 0 && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-2 text-rose-950 text-xs shadow-2xs"
        >
          <div className="font-semibold flex items-center gap-2 text-rose-900 text-sm">
            <span className="material-symbols-outlined text-lg text-rose-700">error</span>
            <span>Physical Validation Rejection</span>
          </div>
          <p className="text-rose-800 text-xs">
            Observation failed deterministic ingestion checks and was not recorded into the on-chain ledger:
          </p>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-rose-900 bg-rose-100/60 p-2.5 rounded-lg border border-rose-200">
            {inlineErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Duplicate ID Conflict Banner */}
      {duplicateConflictError && (
        <div
          role="alert"
          className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-1.5 text-orange-950 text-xs shadow-2xs"
        >
          <div className="font-semibold flex items-center gap-2 text-orange-900 text-sm">
            <span className="material-symbols-outlined text-lg text-orange-700">warning</span>
            <span>Duplicate Observation ID Detected (HTTP 409 Conflict)</span>
          </div>
          <p className="text-orange-900 leading-relaxed">{duplicateConflictError}</p>
        </div>
      )}

      {/* Main Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-stone-200 p-5 sm:p-7 space-y-6 shadow-2xs"
      >
        {/* Section 1: Measurement */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
              1. Core Telemetry &amp; Identifiers
            </span>
            <span className="text-[11px] font-mono text-stone-400">* Required Fields</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Observation UUID *
              </label>
              <input
                type="text"
                required
                value={formData.observationId || ''}
                onChange={(e) => handleInputChange('observationId', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 font-mono text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white shadow-2xs"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                RFC 4122 compliant URN format (e.g., urn:uuid:...)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Sensor Identifier *
              </label>
              <input
                type="text"
                required
                value={formData.sensorId || ''}
                onChange={(e) => handleInputChange('sensorId', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                Official station or hardware node ID
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                PM2.5 Value (µg/m³) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.value !== undefined ? formData.value : ''}
                onChange={(e) => handleInputChange('value', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white font-mono text-sm font-bold text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                Physical bounds: 0.0 to 1000.0 µg/m³
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Pollutant / Unit
              </label>
              <input
                type="text"
                disabled
                value="PM2.5 (ug/m3)"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-100 font-mono text-xs text-stone-600 cursor-not-allowed"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                Locked to PM2.5 for Phase 2 MVP
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Observation Timestamp (UTC) *
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={formData.timestampObserved || ''}
                  onChange={(e) => handleInputChange('timestampObserved', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white font-mono text-xs text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('timestampObserved', new Date().toISOString())}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium shrink-0 transition"
                  title="Set to Current UTC"
                >
                  Now
                </button>
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                ISO 8601 UTC (±5 min drift, 24 hr max age)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Privacy-Conscious Location */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
              2. Location (Quantized Grid)
            </span>
            <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="material-symbols-outlined text-[13px] text-emerald-700">lock</span>
              <span>Privacy Grid (~1.1 km resolution)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">Grid Lat</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.location?.gridLat || 0}
                onChange={(e) => handleInputChange('location.gridLat', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">Grid Lon</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.location?.gridLon || 0}
                onChange={(e) => handleInputChange('location.gridLon', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">Country</label>
              <input
                type="text"
                maxLength={2}
                required
                value={formData.location?.countryCode || 'IN'}
                onChange={(e) => handleInputChange('location.countryCode', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-mono text-stone-900 uppercase focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">Air Basin Zone</label>
              <input
                type="text"
                required
                value={formData.location?.zoneId || ''}
                onChange={(e) => handleInputChange('location.zoneId', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Sensor Hardware & Calibration */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
              3. Sensor Hardware &amp; Calibration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Sensor Deployment Tier
              </label>
              <select
                value={formData.sensorMetadata?.sensorType || SensorType.LOW_COST_IOT}
                onChange={(e) => handleInputChange('sensorMetadata.sensorType', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              >
                <option value={SensorType.OFFICIAL_REFERENCE}>OFFICIAL_REFERENCE (Reference Station)</option>
                <option value={SensorType.LOW_COST_IOT}>LOW_COST_IOT (Optical Particle Counter)</option>
                <option value={SensorType.CITIZEN_SCIENCE}>CITIZEN_SCIENCE (Community Deployment)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Calibration Status
              </label>
              <select
                value={formData.sensorMetadata?.calibrationStatus || CalibrationStatus.FACTORY_CALIBRATED}
                onChange={(e) => handleInputChange('sensorMetadata.calibrationStatus', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              >
                <option value={CalibrationStatus.CO_LOCATED_VERIFIED}>CO_LOCATED_VERIFIED</option>
                <option value={CalibrationStatus.FACTORY_CALIBRATED}>FACTORY_CALIBRATED</option>
                <option value={CalibrationStatus.EXPIRED}>EXPIRED (Calibration Overdue)</option>
                <option value={CalibrationStatus.UNKNOWN}>UNKNOWN</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium shadow-xs transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Validating &amp; Screening...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">send</span>
                <span>Validate &amp; Ingest Observation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
