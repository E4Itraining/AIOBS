/**
 * Multi-Tenant Type Definitions
 * Types for multi-tenant SaaS architecture and edge-to-core synchronization
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  ResourceIdentifier,
  ActorIdentity,
  JSONObject,
  TimeWindow,
  FeatureFlags,
} from './common';

// ============================================================================
// Tenant Definition
// ============================================================================

/** Tenant configuration */
export interface Tenant {
  id: UUID;
  name: string;
  displayName: string;
  description?: string;

  // Organization details
  organization: Organization;

  // Subscription
  subscription: TenantSubscription;

  // Configuration
  config: TenantConfig;

  // Isolation
  isolation: IsolationConfig;

  // Status
  status: TenantStatus;

  // Metadata
  createdAt: ISO8601;
  updatedAt: ISO8601;
  activatedAt?: ISO8601;
  suspendedAt?: ISO8601;
}

export interface Organization {
  name: string;
  domain: string;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  region: string;
  contacts: TenantContact[];
}

export interface TenantContact {
  type: 'admin' | 'billing' | 'technical' | 'security';
  name: string;
  email: string;
  phone?: string;
}

export type TenantStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'deactivated'
  | 'archived';

// ============================================================================
// Subscription and Licensing
// ============================================================================

export interface TenantSubscription {
  plan: SubscriptionPlan;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';

  // Billing
  billing: BillingConfig;

  // Limits
  limits: ResourceQuotas;

  // Features
  features: FeatureEntitlements;

  // Dates
  startDate: ISO8601;
  endDate?: ISO8601;
  trialEndDate?: ISO8601;
}

export interface SubscriptionPlan {
  id: UUID;
  name: string;
  description: string;
  features: string[];
  pricing: PricingModel;
}

export interface PricingModel {
  type: 'flat' | 'per_unit' | 'tiered' | 'usage_based';
  basePrice: number;
  currency: string;
  billingCycle: 'monthly' | 'annual';
  unitPrice?: number;
  unitName?: string;
  tiers?: PricingTier[];
}

export interface PricingTier {
  upTo: number;
  pricePerUnit: number;
}

export interface BillingConfig {
  billingEmail: string;
  paymentMethod?: 'card' | 'invoice' | 'bank_transfer';
  taxId?: string;
  billingAddress?: Address;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface ResourceQuotas {
  maxModels: number;
  maxPipelines: number;
  maxUsers: number;
  maxEventsPerDay: number;
  maxStorageGB: number;
  maxApiCallsPerMinute: number;
  maxDashboards: number;
  maxAlerts: number;
  retentionDays: number;
}

export interface FeatureEntitlements {
  // Core features
  cognitiveMetrics: boolean;
  causalAnalysis: boolean;
  incidentManagement: boolean;
  complianceReporting: boolean;

  // Advanced features
  customDashboards: boolean;
  advancedAlerts: boolean;
  sloManagement: boolean;
  auditExport: boolean;
  apiAccess: boolean;

  // Enterprise features
  sso: boolean;
  rbac: boolean;
  dedicatedSupport: boolean;
  onPremise: boolean;
  customIntegrations: boolean;

  // Feature flags
  flags: FeatureFlags;
}

// ============================================================================
// Tenant Configuration
// ============================================================================

export interface TenantConfig {
  // General settings
  general: GeneralConfig;

  // Security settings
  security: SecurityConfig;

  // Integration settings
  integrations: IntegrationsConfig;

  // Notification settings
  notifications: NotificationSettings;

  // Data settings
  data: DataConfig;
}

export interface GeneralConfig {
  timezone: string;
  dateFormat: string;
  language: string;
  branding?: BrandingConfig;
}

export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
}

export interface SecurityConfig {
  // Authentication
  authMethods: AuthMethod[];
  ssoConfig?: SSOConfig;
  mfaRequired: boolean;

  // Session
  sessionTimeout: number;
  maxConcurrentSessions: number;

  // IP restrictions
  ipAllowlist?: string[];
  ipDenylist?: string[];

  // Data security
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  dataClassification: DataClassification;
}

export type AuthMethod = 'password' | 'sso' | 'api_key' | 'oauth';

export interface SSOConfig {
  provider: 'okta' | 'azure_ad' | 'google' | 'saml' | 'oidc';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: Record<string, string>;
}

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface IntegrationsConfig {
  enabled: IntegrationConfig[];
  webhooks: WebhookConfig[];
}

export interface IntegrationConfig {
  type: string;
  name: string;
  enabled: boolean;
  config: JSONObject;
  credentials?: string; // Reference to secret
}

export interface WebhookConfig {
  id: UUID;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface NotificationSettings {
  defaultChannels: string[];
  quietHours?: QuietHours;
  escalationEnabled: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string;
  timezone: string;
  exceptSeverities: string[];
}

export interface DataConfig {
  retentionPolicy: RetentionPolicy;
  exportConfig: ExportConfig;
  anonymization: AnonymizationConfig;
}

export interface RetentionPolicy {
  metricsRetentionDays: number;
  logsRetentionDays: number;
  auditRetentionDays: number;
  incidentsRetentionDays: number;
  archiveEnabled: boolean;
  archiveAfterDays?: number;
}

export interface ExportConfig {
  allowedFormats: ('json' | 'csv' | 'parquet')[];
  maxExportSize: number;
  requireApproval: boolean;
}

export interface AnonymizationConfig {
  enabled: boolean;
  fields: string[];
  method: 'hash' | 'mask' | 'redact' | 'generalize';
}

// ============================================================================
// Tenant Isolation
// ============================================================================

export interface IsolationConfig {
  level: IsolationLevel;
  namespace: string;

  // Database isolation
  database: DatabaseIsolation;

  // Compute isolation
  compute: ComputeIsolation;

  // Network isolation
  network: NetworkIsolation;
}

export type IsolationLevel = 'shared' | 'namespace' | 'dedicated';

export interface DatabaseIsolation {
  type: 'shared_schema' | 'separate_schema' | 'separate_database';
  schemaPrefix?: string;
  databaseName?: string;
  connectionPool: number;
}

export interface ComputeIsolation {
  type: 'shared' | 'dedicated';
  resourceLimits?: ComputeResourceLimits;
  nodeSelector?: Record<string, string>;
}

export interface ComputeResourceLimits {
  cpuLimit: string;
  memoryLimit: string;
  gpuLimit?: number;
}

export interface NetworkIsolation {
  vpcId?: string;
  subnetIds?: string[];
  securityGroups?: string[];
  privateEndpoints: boolean;
}

// ============================================================================
// Edge Deployment
// ============================================================================

/** Edge deployment configuration */
export interface EdgeDeployment {
  id: UUID;
  tenantId: UUID;
  name: string;
  description?: string;

  // Edge location
  location: EdgeLocation;

  // Deployment config
  config: EdgeConfig;

  // Sync configuration
  sync: EdgeSyncConfig;

  // Status
  status: EdgeStatus;

  // Metadata
  createdAt: ISO8601;
  updatedAt: ISO8601;
  lastSyncAt?: ISO8601;
}

export interface EdgeLocation {
  region: string;
  zone?: string;
  provider: 'aws' | 'azure' | 'gcp' | 'on_premise' | 'other';
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface EdgeConfig {
  // Compute resources
  resources: ComputeResourceLimits;

  // Capabilities
  capabilities: EdgeCapabilities;

  // Local storage
  storage: EdgeStorageConfig;

  // Offline mode
  offlineMode: OfflineModeConfig;
}

export interface EdgeCapabilities {
  metricsCollection: boolean;
  cognitiveAnalysis: boolean;
  incidentDetection: boolean;
  localDashboard: boolean;
  dataPreprocessing: boolean;
}

export interface EdgeStorageConfig {
  localRetentionHours: number;
  maxStorageGB: number;
  compressionEnabled: boolean;
}

export interface OfflineModeConfig {
  enabled: boolean;
  maxOfflineHours: number;
  priorityData: string[];
  degradedFeatures: string[];
}

export interface EdgeSyncConfig {
  // Sync direction
  direction: 'edge_to_core' | 'core_to_edge' | 'bidirectional';

  // Sync frequency
  frequency: TimeWindow;
  realTimeStreaming: boolean;

  // Data selection
  dataTypes: EdgeDataType[];
  filters?: SyncFilter[];

  // Conflict resolution
  conflictResolution: 'core_wins' | 'edge_wins' | 'latest_wins' | 'manual';

  // Security
  encryptionRequired: boolean;
  compressionEnabled: boolean;
}

export type EdgeDataType =
  | 'metrics'
  | 'events'
  | 'incidents'
  | 'configurations'
  | 'models'
  | 'dashboards';

export interface SyncFilter {
  dataType: EdgeDataType;
  filter: string;
  include: boolean;
}

export interface EdgeStatus {
  state: 'online' | 'offline' | 'degraded' | 'syncing' | 'error';
  lastHeartbeat: ISO8601;
  syncStatus: SyncStatus;
  health: EdgeHealth;
}

export interface SyncStatus {
  lastSuccessfulSync: ISO8601;
  pendingChanges: number;
  syncErrors: number;
  syncLag: number; // seconds
}

export interface EdgeHealth {
  score: NormalizedScore;
  cpu: NormalizedScore;
  memory: NormalizedScore;
  storage: NormalizedScore;
  connectivity: NormalizedScore;
}

// ============================================================================
// Deployment Modes
// ============================================================================

/** Deployment mode configuration */
export interface DeploymentMode {
  type: DeploymentType;
  config: DeploymentConfig;
}

export type DeploymentType =
  | 'saas_multi_tenant'
  | 'saas_single_tenant'
  | 'hybrid'
  | 'on_premise'
  | 'air_gapped';

export interface DeploymentConfig {
  // Core platform
  coreLocation: 'cloud' | 'on_premise';
  cloudProvider?: 'aws' | 'azure' | 'gcp';
  region?: string;

  // High availability
  highAvailability: boolean;
  multiRegion: boolean;
  disasterRecovery: boolean;

  // Data residency
  dataResidency: DataResidencyConfig;

  // Compliance
  complianceRequirements: string[];
}

export interface DataResidencyConfig {
  primaryRegion: string;
  allowedRegions: string[];
  restrictedRegions: string[];
  crossBorderTransfer: boolean;
}

// ============================================================================
// Usage and Metering
// ============================================================================

/** Usage metrics for billing */
export interface UsageMetrics {
  tenantId: UUID;
  period: TimeWindow;

  // Resource usage
  resources: ResourceUsage;

  // API usage
  api: ApiUsage;

  // Feature usage
  features: FeatureUsage;

  // Cost allocation
  costs: CostAllocation;
}

export interface ResourceUsage {
  modelsActive: number;
  pipelinesActive: number;
  eventsIngested: number;
  storageUsedGB: number;
  computeHours: number;
}

export interface ApiUsage {
  totalCalls: number;
  callsByEndpoint: Record<string, number>;
  errorRate: NormalizedScore;
  avgLatencyMs: number;
}

export interface FeatureUsage {
  dashboardViews: number;
  reportsGenerated: number;
  alertsTriggered: number;
  incidentsCreated: number;
  sloBreaches: number;
}

export interface CostAllocation {
  total: number;
  currency: string;
  breakdown: Record<string, number>;
  overage?: number;
}

// ============================================================================
// Tenant Onboarding
// ============================================================================

export interface OnboardingStatus {
  tenantId: UUID;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  steps: OnboardingStep[];
  progress: NormalizedScore;
  startedAt?: ISO8601;
  completedAt?: ISO8601;
}

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  required: boolean;
  order: number;
  completedAt?: ISO8601;
  completedBy?: ActorIdentity;
}
