/**
 * MITRE ATT&CK ICS Pattern Database
 *
 * Local database of ICS-specific attack patterns (T0800-T0900+).
 * Provides technique definitions, detection rules, and mitigation strategies
 * for AI/OT threat detection.
 */

import {
  MITRETechnique,
  MITRETacticInfo,
  AttackPattern,
  MITREDatabase,
  DetectionRule,
} from '../../core/types/mitre-attack';

/**
 * Get the full MITRE ATT&CK ICS database (local, no cloud dependency)
 */
export function getMITREDatabase(): MITREDatabase {
  return {
    version: '14.1',
    lastUpdated: '2024-10-31T00:00:00Z',
    tactics: MITRE_ICS_TACTICS,
    techniques: MITRE_ICS_TECHNIQUES,
    attackPatterns: AI_OT_ATTACK_PATTERNS,
  };
}

/**
 * Look up a technique by ID
 */
export function getTechniqueById(id: string): MITRETechnique | undefined {
  return MITRE_ICS_TECHNIQUES.find(t => t.id === id);
}

/**
 * Get techniques for a specific tactic
 */
export function getTechniquesByTactic(tactic: string): MITRETechnique[] {
  return MITRE_ICS_TECHNIQUES.filter(t =>
    t.tactics.includes(tactic as MITRETacticInfo['shortName'])
  );
}

/**
 * Get attack patterns targeting AI systems
 */
export function getAITargetedPatterns(): AttackPattern[] {
  return AI_OT_ATTACK_PATTERNS.filter(p => p.aiTargeted);
}

/**
 * Get attack patterns targeting OT systems
 */
export function getOTTargetedPatterns(): AttackPattern[] {
  return AI_OT_ATTACK_PATTERNS.filter(p => p.otTargeted);
}

// ============================================================================
// MITRE ATT&CK ICS Tactics
// ============================================================================

const MITRE_ICS_TACTICS: MITRETacticInfo[] = [
  { id: 'TA0108', name: 'Initial Access', shortName: 'initial_access', description: 'Techniques to gain initial foothold in ICS network', url: 'https://attack.mitre.org/tactics/TA0108/' },
  { id: 'TA0104', name: 'Execution', shortName: 'execution', description: 'Techniques to run malicious code on ICS', url: 'https://attack.mitre.org/tactics/TA0104/' },
  { id: 'TA0110', name: 'Persistence', shortName: 'persistence', description: 'Techniques to maintain access to ICS', url: 'https://attack.mitre.org/tactics/TA0110/' },
  { id: 'TA0111', name: 'Privilege Escalation', shortName: 'privilege_escalation', description: 'Techniques to gain higher privileges', url: 'https://attack.mitre.org/tactics/TA0111/' },
  { id: 'TA0103', name: 'Evasion', shortName: 'evasion', description: 'Techniques to avoid detection', url: 'https://attack.mitre.org/tactics/TA0103/' },
  { id: 'TA0102', name: 'Discovery', shortName: 'discovery', description: 'Techniques to learn about the ICS environment', url: 'https://attack.mitre.org/tactics/TA0102/' },
  { id: 'TA0109', name: 'Lateral Movement', shortName: 'lateral_movement', description: 'Techniques to move within ICS network', url: 'https://attack.mitre.org/tactics/TA0109/' },
  { id: 'TA0100', name: 'Collection', shortName: 'collection', description: 'Techniques to gather ICS data', url: 'https://attack.mitre.org/tactics/TA0100/' },
  { id: 'TA0101', name: 'Command and Control', shortName: 'command_and_control', description: 'Techniques to communicate with compromised systems', url: 'https://attack.mitre.org/tactics/TA0101/' },
  { id: 'TA0107', name: 'Inhibit Response Function', shortName: 'inhibit_response_function', description: 'Techniques to prevent safety/protection functions', url: 'https://attack.mitre.org/tactics/TA0107/' },
  { id: 'TA0106', name: 'Impair Process Control', shortName: 'impair_process_control', description: 'Techniques to manipulate physical processes', url: 'https://attack.mitre.org/tactics/TA0106/' },
  { id: 'TA0105', name: 'Impact', shortName: 'impact', description: 'Techniques to disrupt, destroy, or manipulate', url: 'https://attack.mitre.org/tactics/TA0105/' },
];

// ============================================================================
// MITRE ATT&CK ICS Techniques (key subset for AI/OT)
// ============================================================================

const MITRE_ICS_TECHNIQUES: MITRETechnique[] = [
  {
    id: 'T0816',
    name: 'Device Restart/Shutdown',
    description: 'Adversaries may forcibly restart or shutdown devices to disrupt availability.',
    tactics: ['inhibit_response_function', 'impact'],
    detectionMethods: ['Monitor for unexpected device restarts', 'Correlate restart events with network activity'],
    mitigations: ['Access management', 'Network segmentation', 'Redundancy'],
    dataSources: ['Network traffic', 'Application log', 'Process monitoring'],
    defaultSeverity: 'high',
    icsSpecific: true,
  },
  {
    id: 'T0855',
    name: 'Unauthorized Command Message',
    description: 'Adversaries may send unauthorized command messages to instruct control system assets to perform actions.',
    tactics: ['impair_process_control', 'execution'],
    detectionMethods: ['Protocol-aware deep packet inspection', 'Command validation against baseline'],
    mitigations: ['Command authentication', 'Protocol whitelisting', 'Encrypted communications'],
    dataSources: ['Network traffic', 'Packet capture', 'ICS protocol logs'],
    defaultSeverity: 'critical',
    icsSpecific: true,
  },
  {
    id: 'T0882',
    name: 'Theft of Operational Information',
    description: 'Adversaries may steal operational information including design documents, ICS configurations, and process data.',
    tactics: ['collection'],
    detectionMethods: ['Data exfiltration monitoring', 'File access auditing', 'Network anomaly detection'],
    mitigations: ['Data classification', 'Access controls', 'DLP'],
    dataSources: ['File monitoring', 'Network traffic', 'Process monitoring'],
    defaultSeverity: 'high',
    icsSpecific: true,
  },
  {
    id: 'T0836',
    name: 'Modify Parameter',
    description: 'Adversaries may modify parameters to cause a safety or operational disruption.',
    tactics: ['impair_process_control'],
    detectionMethods: ['Parameter change monitoring', 'Setpoint validation', 'Rate-of-change analysis'],
    mitigations: ['Parameter locking', 'Change management', 'Multi-factor authentication'],
    dataSources: ['Application log', 'Network traffic', 'Operational database'],
    defaultSeverity: 'critical',
    icsSpecific: true,
  },
  {
    id: 'T0831',
    name: 'Manipulation of Control',
    description: 'Adversaries may manipulate physical process control to cause damage or disruption.',
    tactics: ['impair_process_control', 'impact'],
    detectionMethods: ['Process behavior analytics', 'Control logic monitoring', 'Physics-based anomaly detection'],
    mitigations: ['Safety instrumented systems', 'Process limits', 'Independent monitoring'],
    dataSources: ['Asset', 'Network traffic', 'Operational database'],
    defaultSeverity: 'critical',
    icsSpecific: true,
  },
  {
    id: 'T0879',
    name: 'Damage to Property',
    description: 'Adversaries may cause physical damage to equipment through manipulation of process controls.',
    tactics: ['impact'],
    detectionMethods: ['Safety system monitoring', 'Process envelope validation', 'Equipment health monitoring'],
    mitigations: ['Safety instrumented systems', 'Physical safeguards', 'Independent safety PLCs'],
    dataSources: ['Asset', 'Operational database', 'Application log'],
    defaultSeverity: 'critical',
    icsSpecific: true,
  },
  {
    id: 'T0856',
    name: 'Spoof Reporting Message',
    description: 'Adversaries may spoof reporting messages to manipulate operator view of process state.',
    tactics: ['evasion', 'impair_process_control'],
    detectionMethods: ['Message authentication verification', 'Cross-validation with independent sensors'],
    mitigations: ['Message authentication', 'Independent monitoring', 'Redundant reporting'],
    dataSources: ['Network traffic', 'Packet capture'],
    defaultSeverity: 'critical',
    icsSpecific: true,
  },
  {
    id: 'T0863',
    name: 'User Execution',
    description: 'Adversaries may trick users into running malicious code on ICS systems.',
    tactics: ['execution'],
    detectionMethods: ['User behavior analytics', 'Endpoint monitoring', 'Application whitelisting alerts'],
    mitigations: ['User training', 'Application whitelisting', 'Email filtering'],
    dataSources: ['Process monitoring', 'Application log'],
    defaultSeverity: 'medium',
    icsSpecific: true,
  },
  {
    id: 'T0886',
    name: 'Remote Services',
    description: 'Adversaries may use remote services to access ICS systems.',
    tactics: ['initial_access', 'lateral_movement'],
    detectionMethods: ['Remote access monitoring', 'Authentication logging', 'Session tracking'],
    mitigations: ['Jump servers', 'MFA', 'Network segmentation'],
    dataSources: ['Logon session', 'Network traffic', 'Process monitoring'],
    defaultSeverity: 'high',
    icsSpecific: true,
  },
  {
    id: 'T0857',
    name: 'System Firmware',
    description: 'Adversaries may modify system firmware to maintain persistence or alter system behavior.',
    tactics: ['persistence', 'inhibit_response_function'],
    detectionMethods: ['Firmware integrity verification', 'Version monitoring', 'Hash comparison'],
    mitigations: ['Secure boot', 'Firmware signing', 'Regular verification'],
    dataSources: ['Firmware', 'Application log', 'Network traffic'],
    defaultSeverity: 'critical',
    icsSpecific: true,
  },
];

// ============================================================================
// AI/OT-Specific Attack Patterns (AIOBS Custom)
// ============================================================================

const AI_OT_ATTACK_PATTERNS: AttackPattern[] = [
  {
    id: 'AIOBS-AP-001',
    name: 'AI Model Semantic Poisoning via OT Data Manipulation',
    techniques: ['T0836', 'T0856'],
    tactics: ['impair_process_control', 'evasion'],
    detectionRules: [
      {
        id: 'DR-001',
        description: 'Detect semantic drift in AI model coinciding with OT parameter changes',
        signalType: 'semantic_drift',
        conditions: [
          { field: 'semanticDrift.overallScore', operator: 'gt', value: 0.6 },
          { field: 'context.statisticallyNormal', operator: 'eq', value: true },
        ],
        operator: 'and',
        timeWindow: 3600,
      },
    ],
    confidenceThreshold: 0.7,
    severity: 'critical',
    aiTargeted: true,
    otTargeted: true,
  },
  {
    id: 'AIOBS-AP-002',
    name: 'Unauthorized Command Injection via Compromised AI Decision Engine',
    techniques: ['T0855', 'T0831'],
    tactics: ['impair_process_control', 'execution'],
    detectionRules: [
      {
        id: 'DR-002',
        description: 'Detect unauthorized commands correlated with AI decision anomalies',
        signalType: 'command_injection',
        conditions: [
          { field: 'command.authorized', operator: 'eq', value: false },
          { field: 'aiDecision.confidence', operator: 'lt', value: 0.5 },
        ],
        operator: 'and',
        timeWindow: 300,
      },
    ],
    confidenceThreshold: 0.8,
    severity: 'critical',
    aiTargeted: true,
    otTargeted: true,
  },
  {
    id: 'AIOBS-AP-003',
    name: 'AI Inference Exfiltration via OT Protocol Covert Channel',
    techniques: ['T0882'],
    tactics: ['collection'],
    detectionRules: [
      {
        id: 'DR-003',
        description: 'Detect unusual data patterns in OT protocols that may encode AI model data',
        signalType: 'network_anomaly',
        conditions: [
          { field: 'traffic.protocol', operator: 'eq', value: 'modbus' },
          { field: 'traffic.entropy', operator: 'gt', value: 0.9 },
        ],
        operator: 'and',
        timeWindow: 600,
      },
    ],
    confidenceThreshold: 0.6,
    severity: 'high',
    aiTargeted: true,
    otTargeted: true,
  },
  {
    id: 'AIOBS-AP-004',
    name: 'Adversarial AI Model Replacement via Firmware Update',
    techniques: ['T0857'],
    tactics: ['persistence', 'impair_process_control'],
    detectionRules: [
      {
        id: 'DR-004',
        description: 'Detect firmware changes correlated with AI model behavior changes',
        signalType: 'firmware_change',
        conditions: [
          { field: 'firmware.hashChanged', operator: 'eq', value: true },
          { field: 'firmware.authorized', operator: 'eq', value: false },
        ],
        operator: 'and',
        timeWindow: 86400,
      },
    ],
    confidenceThreshold: 0.9,
    severity: 'critical',
    aiTargeted: true,
    otTargeted: false,
  },
  {
    id: 'AIOBS-AP-005',
    name: 'Process Manipulation via AI Decision Boundary Erosion',
    techniques: ['T0831', 'T0836'],
    tactics: ['impair_process_control'],
    detectionRules: [
      {
        id: 'DR-005',
        description: 'Detect gradual AI decision boundary shifts leading to process parameter changes',
        signalType: 'semantic_drift',
        conditions: [
          { field: 'contextAnalysis.decisionBoundaryShift', operator: 'gt', value: 0.3 },
          { field: 'contextAnalysis.temporalConsistency', operator: 'lt', value: 0.6 },
        ],
        operator: 'and',
        timeWindow: 7200,
      },
    ],
    confidenceThreshold: 0.65,
    severity: 'high',
    aiTargeted: true,
    otTargeted: true,
  },
  {
    id: 'AIOBS-AP-006',
    name: 'HMI Spoofing via AI Reporting Manipulation',
    techniques: ['T0856'],
    tactics: ['evasion', 'impair_process_control'],
    detectionRules: [
      {
        id: 'DR-006',
        description: 'Detect discrepancy between AI-reported state and independent sensor readings',
        signalType: 'process_anomaly',
        conditions: [
          { field: 'discrepancy.magnitude', operator: 'gt', value: 0.2 },
          { field: 'discrepancy.persistent', operator: 'eq', value: true },
        ],
        operator: 'and',
        timeWindow: 1800,
      },
    ],
    confidenceThreshold: 0.7,
    severity: 'critical',
    aiTargeted: true,
    otTargeted: true,
  },
];
