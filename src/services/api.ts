/**
 * SensorTrust — HTTP API Service Adapter & Client
 * Integrates the React frontend with the real FastAPI backend (/api/v1).
 * Preserves the SensorTrustApiService contract while providing full HTTP communication,
 * robust error translation, and graceful offline handling.
 */

import {
  ObservationPayload,
  EnrichedObservation,
  ObservationStatus,
  AnomalySeverity,
  ReviewDecisionType,
  MetricsSummaryResponse,
  PaginatedObservationsResponse,
  SubmitObservationResponse,
  ReviewDecisionResponse,
  VerificationResponse,
  HealthResponse
} from '../core/contracts.ts';

// Resolve API base URL from Vite environment variables or fallback to local FastAPI default
const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  try {
    // Vite import.meta.env
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_API_BASE_URL) {
      return metaEnv.VITE_API_BASE_URL;
    }
  } catch {
    // Ignore in non-Vite environments
  }
  return DEFAULT_API_BASE_URL;
}

export interface SensorTrustApiService {
  getHealth(): Promise<HealthResponse>;
  getMetrics(): Promise<MetricsSummaryResponse>;
  getObservations(params?: {
    status?: ObservationStatus | 'ALL';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedObservationsResponse>;
  getObservationById(id: string): Promise<EnrichedObservation | null>;
  submitObservation(payload: Partial<ObservationPayload>): Promise<SubmitObservationResponse>;
  getReviewQueue(params?: { severity?: AnomalySeverity | 'ALL' }): Promise<EnrichedObservation[]>;
  submitReviewDecision(params: {
    observationId: string;
    decision: ReviewDecisionType;
    reason: string;
    reviewerId?: string;
  }): Promise<ReviewDecisionResponse>;
  verifyProvenance(params: {
    observationId: string;
    candidatePayload: any;
  }): Promise<VerificationResponse>;
  resetToDefaultSeed(): Promise<void> | void;
}

export class HttpSensorTrustService implements SensorTrustApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl();
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async getHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Degraded health fallback when backend is unreachable
    }
    return {
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      database: 'IN_MEMORY_PROTOTYPE',
      blockchain: {
        network: 'FastAPI Backend Disconnected',
        chainId: 0,
        contractAddress: '',
        latestBlock: 0,
        isSimulatedLocalNode: false
      }
    };
  }

  async getMetrics(): Promise<MetricsSummaryResponse> {
    const res = await fetch(`${this.baseUrl}/metrics/summary`);
    if (!res.ok) {
      throw new Error(`Failed to fetch network metrics (HTTP ${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  async getObservations(params?: {
    status?: ObservationStatus | 'ALL';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedObservationsResponse> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      query.set('status', params.status);
    }
    if (params?.search && params.search.trim()) {
      query.set('search', params.search.trim());
    }
    if (params?.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      query.set('offset', String(params.offset));
    }

    const url = `${this.baseUrl}/observations${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list observations (HTTP ${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  async getObservationById(id: string): Promise<EnrichedObservation | null> {
    const cleanId = encodeURIComponent(id.trim());
    const res = await fetch(`${this.baseUrl}/observations/${cleanId}`);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch observation '${id}' (HTTP ${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  async submitObservation(payload: Partial<ObservationPayload>): Promise<SubmitObservationResponse> {
    const res = await fetch(`${this.baseUrl}/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // 201 Created -> successful ingestion
    if (res.status === 201) {
      return await res.json();
    }

    // 409 Conflict or 422 Unprocessable -> structured validation failure response
    if (res.status === 409 || res.status === 422 || res.status === 400) {
      const errBody = await res.json().catch(() => null);
      if (errBody && errBody.validation) {
        return errBody as SubmitObservationResponse;
      }
    }

    const errText = await res.text().catch(() => 'Unknown network error');
    throw new Error(`Observation submission failed (HTTP ${res.status}): ${errText}`);
  }

  async getReviewQueue(params?: { severity?: AnomalySeverity | 'ALL' }): Promise<EnrichedObservation[]> {
    const query = new URLSearchParams();
    if (params?.severity && params.severity !== 'ALL') {
      query.set('severity', params.severity);
    }

    const url = `${this.baseUrl}/reviews/queue${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch review queue (HTTP ${res.status}): ${res.statusText}`);
    }
    return await res.json();
  }

  async submitReviewDecision(params: {
    observationId: string;
    decision: ReviewDecisionType;
    reason: string;
    reviewerId?: string;
  }): Promise<ReviewDecisionResponse> {
    const { observationId, decision, reason, reviewerId } = params;

    // Client-side pre-validation
    if (!reason || reason.trim().length < 10) {
      throw new Error('ERR_REVIEW_JUSTIFICATION_REQUIRED: Decision justification must be at least 10 characters.');
    }

    const cleanId = encodeURIComponent(observationId.trim());
    const res = await fetch(`${this.baseUrl}/reviews/${cleanId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decision,
        reason: reason.trim(),
        reviewerId: reviewerId || 'reviewer:officer-auth0|certified'
      })
    });

    if (res.ok) {
      return await res.json();
    }

    const errData = await res.json().catch(() => null);
    if (errData?.message) {
      throw new Error(errData.message);
    }
    if (errData?.code) {
      throw new Error(errData.code);
    }
    throw new Error(`Failed to record review decision (HTTP ${res.status}): ${res.statusText}`);
  }

  async verifyProvenance(params: {
    observationId: string;
    candidatePayload: any;
  }): Promise<VerificationResponse> {
    const res = await fetch(`${this.baseUrl}/provenance/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        observationId: params.observationId,
        candidatePayload: params.candidatePayload
      })
    });

    if (!res.ok) {
      throw new Error(`Provenance verification request failed (HTTP ${res.status}): ${res.statusText}`);
    }

    return await res.json();
  }

  async resetToDefaultSeed(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/seed/reset`, {
        method: 'POST'
      });
      if (!res.ok) {
        console.warn(`Seed reset request returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('Seed reset network request failed:', err);
    }
  }
}

// Export default singleton instance
export const sensorTrustApi = new HttpSensorTrustService();
