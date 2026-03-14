/**
 * MITRE ATT&CK ICS Type Definitions
 * Maps AI/OT anomalies to MITRE ATT&CK for ICS framework tactics and techniques.
 * Covers T0800-T0900+ range specific to Industrial Control Systems.
 */

import { ISO8601, UUID, NormalizedScore, SeverityScore } from './common';

// ============================================================================
// MITRE ATT&CK ICS Tactics
// ============================================================================

export type MITRETactic =
  | 'initial_access'
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'evasion'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'command_and_control'
  | 'inhibit_response_function'
  | 'impair_process_control'
  | 'impact';

export interface MITRETacticInfo {
  id: string;       // e.g., "TA0108"
  name: string;
  shortName: MITRETactic;
  description: string;
  url: string;
}

// ============================================================================
// MITRE ATT&CK ICS Techniques
// ============================================================================

export interface MITRETechnique {
  /** Technique ID (e.g., T0816, T0855) */
  id: string;
  /** Technique name */
  name: string;
  /** Description */
  description: string;
  /** Associated tactics */
  tactics: MITRETactic[];
  /** Sub-techniques if any */
  subTechniques?: MITRESubTechnique[];
  /** Detection methods */
  detectionMethods: string[];
  /** Mitigation strategies */
  mitigations: string[];
  /** Data sources for detection */
  dataSources: string[];
  /** Severity when detected in AI/OT context */
  defaultSeverity: 'critical' | 'high' | 'medium' | 'low';
  /** ICS-specific flag */
  icsSpecific: boolean;
}

export interface MITRESubTechnique {
  id: string;
  name: string;
  description: string;
}

// ============================================================================
// Attack Pattern Detection
// ============================================================================

export interface AttackPattern {
  /** Pattern identifier */
  id: UUID;
  /** Pattern name */
  name: string;
  /** MITRE technique(s) this pattern maps to */
  techniques: string[];  // technique IDs
  /** Tactics involved */
  tactics: MITRETactic[];
  /** Detection rules */
  detectionRules: DetectionRule[];
  /** Confidence threshold for triggering */
  confidenceThreshold: NormalizedScore;
  /** Pattern-specific severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Whether this pattern targets AI systems specifically */
  aiTargeted: boolean;
  /** Whether this pattern targets OT systems */
  otTargeted: boolean;
}

export interface DetectionRule {
  /** Rule identifier */
  id: string;
  /** Rule description */
  description: string;
  /** Signal type to match */
  signalType: DetectionSignalType;
  /** Conditions to evaluate */
  conditions: RuleCondition[];
  /** Logical operator for conditions */
  operator: 'and' | 'or';
  /** Time window for condition evaluation */
  timeWindow: number; // seconds
}

export type DetectionSignalType =
  | 'ot_anomaly'          // OT protocol anomaly
  | 'semantic_drift'       // AI semantic drift alert
  | 'network_anomaly'      // Network traffic anomaly
  | 'auth_failure'         // Authentication failure
  | 'process_anomaly'      // Process variable anomaly
  | 'command_injection'    // Unauthorized command
  | 'firmware_change'      // Firmware modification
  | 'configuration_change'; // Configuration modification

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex';
  value: string | number | boolean;
}

// ============================================================================
// MITRE-Enriched Alerts
// ============================================================================

export interface MITREEnrichedAlert {
  /** Original alert ID */
  alertId: UUID;
  /** Enrichment timestamp */
  enrichedAt: ISO8601;

  /** Matched MITRE techniques */
  matchedTechniques: TechniqueMatch[];

  /** Matched tactics (derived from techniques) */
  matchedTactics: MITRETactic[];

  /** Kill chain position */
  killChainPhase: KillChainPhase;

  /** Attack confidence score */
  attackConfidence: NormalizedScore;

  /** Overall threat severity */
  threatSeverity: SeverityScore;

  /** Contextual information */
  context: MITREAlertContext;

  /** Recommended response */
  recommendedResponse: ThreatResponse;
}

export interface TechniqueMatch {
  techniqueId: string;
  techniqueName: string;
  confidence: NormalizedScore;
  matchedIndicators: string[];
  subTechniqueId?: string;
}

export type KillChainPhase =
  | 'reconnaissance'
  | 'weaponization'
  | 'delivery'
  | 'exploitation'
  | 'installation'
  | 'command_control'
  | 'actions_on_objectives';

export interface MITREAlertContext {
  /** Source of the original alert */
  alertSource: 'semantic_drift' | 'ot_connector' | 'network_monitor' | 'siem' | 'manual';
  /** Affected assets */
  affectedAssets: AffectedAsset[];
  /** Related alerts (correlation) */
  relatedAlertIds: UUID[];
  /** Attack narrative */
  narrative: string;
  /** Time since first indicator */
  dwellTimeMs: number;
}

export interface AffectedAsset {
  id: string;
  name: string;
  type: 'ai_model' | 'plc' | 'hmi' | 'scada' | 'network_device' | 'server' | 'sensor';
  criticality: 'mission_critical' | 'high' | 'medium' | 'low';
}

export interface ThreatResponse {
  /** Immediate actions */
  immediateActions: ResponseAction[];
  /** Investigation steps */
  investigationSteps: string[];
  /** Containment strategy */
  containmentStrategy: string;
  /** Escalation path */
  escalationPath: string[];
  /** MITRE mitigations applicable */
  mitreMitigations: string[];
}

export interface ResponseAction {
  action: string;
  priority: 'immediate' | 'short_term' | 'long_term';
  automated: boolean;
  description: string;
}

// ============================================================================
// MITRE ATT&CK ICS Database Types
// ============================================================================

export interface MITREDatabase {
  version: string;
  lastUpdated: ISO8601;
  tactics: MITRETacticInfo[];
  techniques: MITRETechnique[];
  attackPatterns: AttackPattern[];
}
