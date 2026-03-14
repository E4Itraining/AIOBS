/**
 * Compartment Manager
 *
 * Manages security compartments for classified data isolation in defense
 * environments. Enforces data flow controls between classification levels
 * and ensures proper handling of DIFFUSION RESTREINTE and higher materials.
 *
 * @cybersec Security compartment management for defense-grade data isolation
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export type ClassificationLevel =
  | 'NON_PROTEGE'
  | 'DIFFUSION_RESTREINTE'
  | 'CONFIDENTIEL_DEFENSE'
  | 'SECRET_DEFENSE';

export interface SecurityCompartment {
  id: string;
  name: string;
  classification: ClassificationLevel;
  description: string;
  allowedOperations: CompartmentOperation[];
  dataRetentionDays: number;
  auditRequired: boolean;
  createdAt: string;
  createdBy: string;
}

export type CompartmentOperation = 'read' | 'write' | 'export' | 'delete' | 'classify' | 'declassify';

export interface DataFlowRule {
  id: string;
  sourceCompartment: string;
  destCompartment: string;
  allowed: boolean;
  conditions: string[];
  approvalRequired: boolean;
  auditTrail: boolean;
}

export interface CompartmentAccessRequest {
  requestId: string;
  userId: string;
  compartmentId: string;
  operation: CompartmentOperation;
  justification: string;
  timestamp: string;
}

export interface CompartmentAccessResult {
  requestId: string;
  granted: boolean;
  compartmentId: string;
  reason: string;
  auditEntryId: string | null;
}

export interface CompartmentAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  compartmentId: string;
  operation: CompartmentOperation;
  granted: boolean;
  reason: string;
  metadata: Record<string, string>;
}

// ============================================================================
// Implementation
// ============================================================================

const CLASSIFICATION_ORDER: Record<ClassificationLevel, number> = {
  NON_PROTEGE: 0,
  DIFFUSION_RESTREINTE: 1,
  CONFIDENTIEL_DEFENSE: 2,
  SECRET_DEFENSE: 3,
};

/**
 * @cybersec Enforces security compartmentalization for defense-grade operations
 */
export class CompartmentManager {
  private compartments: Map<string, SecurityCompartment> = new Map();
  private flowRules: DataFlowRule[] = [];
  private auditLog: CompartmentAuditEntry[] = [];
  private userClearances: Map<string, ClassificationLevel> = new Map();

  constructor() {
    this.initializeDefaultCompartments();
  }

  /**
   * Request access to a compartment
   * @cybersec Enforces classification-based access control
   */
  requestAccess(request: CompartmentAccessRequest): CompartmentAccessResult {
    const compartment = this.compartments.get(request.compartmentId);
    if (!compartment) {
      return {
        requestId: request.requestId,
        granted: false,
        compartmentId: request.compartmentId,
        reason: 'Compartment not found',
        auditEntryId: null,
      };
    }

    // Check user clearance
    const userClearance = this.userClearances.get(request.userId);
    if (!userClearance) {
      const auditEntryId = this.logAudit(request, false, 'No clearance registered');
      return {
        requestId: request.requestId,
        granted: false,
        compartmentId: request.compartmentId,
        reason: 'User has no registered clearance',
        auditEntryId,
      };
    }

    // Check clearance level is sufficient
    if (CLASSIFICATION_ORDER[userClearance] < CLASSIFICATION_ORDER[compartment.classification]) {
      const auditEntryId = this.logAudit(request, false,
        `Insufficient clearance: ${userClearance} < ${compartment.classification}`);
      return {
        requestId: request.requestId,
        granted: false,
        compartmentId: request.compartmentId,
        reason: `Insufficient clearance level (${userClearance}) for ${compartment.classification} compartment`,
        auditEntryId,
      };
    }

    // Check operation is allowed in this compartment
    if (!compartment.allowedOperations.includes(request.operation)) {
      const auditEntryId = this.logAudit(request, false,
        `Operation ${request.operation} not allowed in compartment`);
      return {
        requestId: request.requestId,
        granted: false,
        compartmentId: request.compartmentId,
        reason: `Operation '${request.operation}' not permitted in this compartment`,
        auditEntryId,
      };
    }

    // Access granted
    const auditEntryId = this.logAudit(request, true, 'Access granted');
    return {
      requestId: request.requestId,
      granted: true,
      compartmentId: request.compartmentId,
      reason: 'Access granted',
      auditEntryId,
    };
  }

  /**
   * Check if data flow between compartments is allowed
   * @cybersec Prevents unauthorized data flow between classification levels
   */
  checkDataFlow(sourceCompartmentId: string, destCompartmentId: string): { allowed: boolean; reason: string } {
    const source = this.compartments.get(sourceCompartmentId);
    const dest = this.compartments.get(destCompartmentId);

    if (!source || !dest) {
      return { allowed: false, reason: 'Invalid compartment(s)' };
    }

    // Data cannot flow from higher to lower classification without declassification
    if (CLASSIFICATION_ORDER[source.classification] > CLASSIFICATION_ORDER[dest.classification]) {
      return {
        allowed: false,
        reason: `Cannot flow data from ${source.classification} to ${dest.classification} — declassification required`,
      };
    }

    // Check explicit flow rules
    const rule = this.flowRules.find(r =>
      r.sourceCompartment === sourceCompartmentId && r.destCompartment === destCompartmentId
    );

    if (rule) {
      return {
        allowed: rule.allowed,
        reason: rule.allowed ? 'Allowed by flow rule' : `Blocked by flow rule: ${rule.conditions.join(', ')}`,
      };
    }

    // Default: allow if same or ascending classification
    return { allowed: true, reason: 'Default policy: same or ascending classification' };
  }

  /**
   * Register a user's clearance level
   */
  setUserClearance(userId: string, clearance: ClassificationLevel): void {
    this.userClearances.set(userId, clearance);
  }

  /**
   * Create a new compartment
   */
  createCompartment(compartment: Omit<SecurityCompartment, 'id' | 'createdAt'>): SecurityCompartment {
    const full: SecurityCompartment = {
      ...compartment,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.compartments.set(full.id, full);
    return full;
  }

  /**
   * Add a data flow rule
   */
  addFlowRule(rule: Omit<DataFlowRule, 'id'>): DataFlowRule {
    const full: DataFlowRule = { ...rule, id: uuidv4() };
    this.flowRules.push(full);
    return full;
  }

  /**
   * Get all compartments
   */
  getCompartments(): SecurityCompartment[] {
    return Array.from(this.compartments.values());
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 100): CompartmentAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private initializeDefaultCompartments(): void {
    const defaults: Array<Omit<SecurityCompartment, 'id' | 'createdAt'>> = [
      {
        name: 'Public Telemetry',
        classification: 'NON_PROTEGE',
        description: 'Non-classified operational telemetry and metrics',
        allowedOperations: ['read', 'write', 'export'],
        dataRetentionDays: 365,
        auditRequired: false,
        createdBy: 'system',
      },
      {
        name: 'SOC Operations',
        classification: 'DIFFUSION_RESTREINTE',
        description: 'SOC alerts, MITRE correlations, incident data',
        allowedOperations: ['read', 'write', 'export'],
        dataRetentionDays: 730,
        auditRequired: true,
        createdBy: 'system',
      },
      {
        name: 'Threat Intelligence',
        classification: 'CONFIDENTIEL_DEFENSE',
        description: 'Classified threat intelligence and attack patterns',
        allowedOperations: ['read', 'write'],
        dataRetentionDays: 1825,
        auditRequired: true,
        createdBy: 'system',
      },
    ];

    for (const def of defaults) {
      this.createCompartment(def);
    }
  }

  private logAudit(
    request: CompartmentAccessRequest,
    granted: boolean,
    reason: string
  ): string {
    const entry: CompartmentAuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: request.userId,
      compartmentId: request.compartmentId,
      operation: request.operation,
      granted,
      reason,
      metadata: { justification: request.justification },
    };
    this.auditLog.push(entry);
    return entry.id;
  }
}
