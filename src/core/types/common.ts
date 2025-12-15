/**
 * Common types used across the AIOBS platform
 */

// ============================================================================
// Primitive Types
// ============================================================================

export type ISO8601 = string;
export type UUID = string;
export type SHA256 = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

// ============================================================================
// Score Types
// ============================================================================

/** Score between 0 and 1 */
export type NormalizedScore = number;

/** Score with severity classification */
export interface SeverityScore {
  value: NormalizedScore;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: NormalizedScore;
}

/** Trend indicator for time-series metrics */
export interface TrendIndicator {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  magnitude: number;
  periodDays: number;
  significance: NormalizedScore;
}

// ============================================================================
// Identity Types
// ============================================================================

/** Actor identity for audit and attribution */
export interface ActorIdentity {
  type: 'user' | 'service' | 'system' | 'pipeline' | 'model';
  id: string;
  name: string;
  tenantId?: string;
  metadata?: Record<string, JSONValue>;
}

/** Resource identifier */
export interface ResourceIdentifier {
  type: ResourceType;
  id: string;
  name: string;
  namespace?: string;
  version?: string;
}

export type ResourceType =
  | 'model'
  | 'pipeline'
  | 'dataset'
  | 'endpoint'
  | 'infrastructure'
  | 'contract'
  | 'policy'
  | 'dashboard';

// ============================================================================
// Time Types
// ============================================================================

/** Time range specification */
export interface TimeRange {
  start: ISO8601;
  end: ISO8601;
}

/** Time window for aggregation */
export interface TimeWindow {
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}

/** Timestamp with timezone */
export interface TimestampedEvent<T> {
  timestamp: ISO8601;
  timezone: string;
  data: T;
}

// ============================================================================
// Status Types
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface SystemHealth {
  status: HealthStatus;
  score: NormalizedScore;
  lastCheck: ISO8601;
  components: ComponentHealth[];
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  metrics?: Record<string, number>;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface AIObsError {
  code: string;
  message: string;
  details?: JSONObject;
  timestamp: ISO8601;
  traceId?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface FeatureFlags {
  [key: string]: boolean | string | number;
}

export interface PlatformConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
  limits: ResourceLimits;
}

export interface ResourceLimits {
  maxModelsPerTenant: number;
  maxEventsPerSecond: number;
  maxRetentionDays: number;
  maxDashboards: number;
}
