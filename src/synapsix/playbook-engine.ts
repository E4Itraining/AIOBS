/**
 * Playbook Engine
 *
 * Automated COMCYBER-aligned response playbooks for ICS/OT threat scenarios.
 * Generates step-by-step response plans based on detected threat type,
 * severity, and operational context.
 *
 * @cybersec Automated incident response for defense/OIV environments
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface Playbook {
  id: string;
  name: string;
  version: string;
  classification: 'NON_PROTEGE' | 'DIFFUSION_RESTREINTE';
  triggerConditions: TriggerCondition[];
  phases: PlaybookPhase[];
  estimatedDuration: string;
  requiredRoles: string[];
  escalationMatrix: EscalationEntry[];
  regulatoryRequirements: string[];
}

export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'gt' | 'contains' | 'in';
  value: string | number | string[];
}

export interface PlaybookPhase {
  order: number;
  name: string;
  description: string;
  duration: string;
  actions: PlaybookAction[];
  gateCondition: string | null;
}

export interface PlaybookAction {
  id: string;
  description: string;
  type: 'automated' | 'manual' | 'approval_required';
  responsible: string;
  verificationStep: string | null;
}

export interface EscalationEntry {
  level: number;
  role: string;
  condition: string;
  timeLimit: string;
  contact: string;
}

export interface PlaybookExecutionContext {
  alertSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threatType: string;
  stealthAttack: boolean;
  affectedAssets: string[];
  mitreTechniques: string[];
  operationalImpact: 'none' | 'degraded' | 'critical' | 'total_loss';
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  startedAt: string;
  context: PlaybookExecutionContext;
  currentPhase: number;
  completedActions: string[];
  status: 'running' | 'paused' | 'completed' | 'aborted';
}

// ============================================================================
// Built-in Playbooks
// ============================================================================

const PLAYBOOKS: Playbook[] = [
  {
    id: 'PB-STEALTH-SEMANTIC-001',
    name: 'Stealth Semantic Drift Response',
    version: '1.0',
    classification: 'DIFFUSION_RESTREINTE',
    triggerConditions: [
      { field: 'stealthAttack', operator: 'eq', value: 'true' },
      { field: 'alertSeverity', operator: 'in', value: ['HIGH', 'CRITICAL'] },
    ],
    phases: [
      {
        order: 1,
        name: 'Immediate Containment',
        description: 'Switch to manual OT control and isolate AI inference path',
        duration: '15min',
        actions: [
          { id: 'SA-1', description: 'Switch affected OT segment to manual mode', type: 'manual', responsible: 'OT Operator', verificationStep: 'Confirm manual control active on HMI' },
          { id: 'SA-2', description: 'Disable AI inference on affected controllers', type: 'automated', responsible: 'SOC L2', verificationStep: 'Verify inference endpoint returns 503' },
          { id: 'SA-3', description: 'Capture network state (PCAP + flow records)', type: 'automated', responsible: 'SOC L1', verificationStep: null },
        ],
        gateCondition: 'Manual control confirmed by OT operator',
      },
      {
        order: 2,
        name: 'Forensic Preservation',
        description: 'Preserve evidence for investigation and regulatory reporting',
        duration: '30min',
        actions: [
          { id: 'SA-4', description: 'Snapshot AI model state and inference logs', type: 'automated', responsible: 'SOC L2', verificationStep: null },
          { id: 'SA-5', description: 'Export semantic drift evidence pack (AI Act compliant)', type: 'automated', responsible: 'Compliance Officer', verificationStep: 'Evidence pack hash verified' },
          { id: 'SA-6', description: 'Verify physical setpoints against AI-reported values', type: 'manual', responsible: 'OT Operator', verificationStep: 'Discrepancy report filed' },
        ],
        gateCondition: null,
      },
      {
        order: 3,
        name: 'Investigation',
        description: 'Determine attack vector, scope, and attribution',
        duration: '4h',
        actions: [
          { id: 'SA-7', description: 'Analyze inference stream for adversarial perturbation patterns', type: 'manual', responsible: 'SOC L3', verificationStep: null },
          { id: 'SA-8', description: 'Correlate with IT network logs for lateral movement indicators', type: 'automated', responsible: 'SOC L2', verificationStep: null },
          { id: 'SA-9', description: 'Check for compromise indicators on upstream model training pipeline', type: 'manual', responsible: 'SOC L3', verificationStep: null },
        ],
        gateCondition: 'Root cause identified or escalated to COMCYBER',
      },
      {
        order: 4,
        name: 'Recovery & Reporting',
        description: 'Restore safe operations and fulfill regulatory obligations',
        duration: '24h',
        actions: [
          { id: 'SA-10', description: 'Deploy verified clean model from known-good baseline', type: 'approval_required', responsible: 'SOC L3', verificationStep: 'Model checksum matches baseline' },
          { id: 'SA-11', description: 'Submit NIS2 incident notification to ANSSI (24h deadline)', type: 'manual', responsible: 'Compliance Officer', verificationStep: 'ANSSI acknowledgment received' },
          { id: 'SA-12', description: 'Generate post-incident report for COMCYBER', type: 'manual', responsible: 'SOC L3', verificationStep: null },
        ],
        gateCondition: null,
      },
    ],
    estimatedDuration: '24-48h',
    requiredRoles: ['SOC L1', 'SOC L2', 'SOC L3', 'OT Operator', 'Compliance Officer'],
    escalationMatrix: [
      { level: 1, role: 'SOC L2', condition: 'Alert severity HIGH or CRITICAL', timeLimit: '15min', contact: 'SOC duty officer' },
      { level: 2, role: 'SOC L3', condition: 'Stealth attack confirmed', timeLimit: '30min', contact: 'SOC manager' },
      { level: 3, role: 'COMCYBER CSIRT', condition: 'OIV impact or defense asset affected', timeLimit: '1h', contact: 'COMCYBER hotline' },
      { level: 4, role: 'ANSSI', condition: 'NIS2 significant incident', timeLimit: '24h', contact: 'cert-fr@ssi.gouv.fr' },
    ],
    regulatoryRequirements: [
      'NIS2: Initial notification within 24h',
      'NIS2: Detailed report within 72h',
      'AI Act: Evidence preservation for audit',
      'COMCYBER: RETEX report within 7 days',
    ],
  },
  {
    id: 'PB-OT-MANIPULATION-001',
    name: 'OT Process Manipulation Response',
    version: '1.0',
    classification: 'DIFFUSION_RESTREINTE',
    triggerConditions: [
      { field: 'threatType', operator: 'contains', value: 'ot_process' },
      { field: 'alertSeverity', operator: 'in', value: ['HIGH', 'CRITICAL'] },
    ],
    phases: [
      {
        order: 1,
        name: 'Emergency Containment',
        description: 'Isolate OT segment and switch to manual control',
        duration: '10min',
        actions: [
          { id: 'OT-1', description: 'Activate emergency OT isolation (network segmentation)', type: 'automated', responsible: 'SOC L2', verificationStep: 'OT segment isolated from IT network' },
          { id: 'OT-2', description: 'Switch to manual control on all affected PLCs/RTUs', type: 'manual', responsible: 'OT Operator', verificationStep: 'Manual mode confirmed' },
          { id: 'OT-3', description: 'Verify physical process safety (pressure, temperature, flow)', type: 'manual', responsible: 'OT Operator', verificationStep: 'Safety parameters within bounds' },
        ],
        gateCondition: 'Process safety verified by OT operator',
      },
      {
        order: 2,
        name: 'Investigation & Remediation',
        description: 'Identify manipulation scope and restore clean state',
        duration: '4h',
        actions: [
          { id: 'OT-4', description: 'Audit all recent setpoint changes via OPC-UA history', type: 'automated', responsible: 'SOC L2', verificationStep: null },
          { id: 'OT-5', description: 'Restore verified PLC programs from offline backup', type: 'approval_required', responsible: 'OT Engineer', verificationStep: 'PLC program checksum matches backup' },
          { id: 'OT-6', description: 'Scan for unauthorized firmware modifications', type: 'manual', responsible: 'SOC L3', verificationStep: null },
        ],
        gateCondition: 'Clean PLC programs restored and verified',
      },
    ],
    estimatedDuration: '4-12h',
    requiredRoles: ['SOC L2', 'SOC L3', 'OT Operator', 'OT Engineer'],
    escalationMatrix: [
      { level: 1, role: 'SOC L2', condition: 'OT process anomaly detected', timeLimit: '10min', contact: 'SOC duty officer' },
      { level: 2, role: 'OT Engineer', condition: 'PLC manipulation confirmed', timeLimit: '30min', contact: 'OT team lead' },
      { level: 3, role: 'COMCYBER CSIRT', condition: 'Multiple PLCs affected', timeLimit: '1h', contact: 'COMCYBER hotline' },
    ],
    regulatoryRequirements: [
      'NIS2: Incident notification if significant impact',
      'Internal: Post-incident review within 48h',
    ],
  },
];

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * @cybersec Automated playbook selection and execution for COMCYBER-aligned response
 */
export class PlaybookEngine {
  private playbooks: Playbook[];
  private executions: PlaybookExecution[] = [];

  constructor(customPlaybooks?: Playbook[]) {
    this.playbooks = customPlaybooks ? [...PLAYBOOKS, ...customPlaybooks] : [...PLAYBOOKS];
  }

  /**
   * Select the best matching playbook for a given threat context
   * @cybersec Selects appropriate COMCYBER response playbook
   */
  selectPlaybook(context: PlaybookExecutionContext): Playbook | null {
    let bestMatch: Playbook | null = null;
    let bestScore = 0;

    for (const playbook of this.playbooks) {
      const score = this.evaluateTriggers(playbook, context);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = playbook;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  /**
   * Start playbook execution
   * @cybersec Initiates incident response workflow
   */
  startExecution(playbookId: string, context: PlaybookExecutionContext): PlaybookExecution | null {
    const playbook = this.playbooks.find(p => p.id === playbookId);
    if (!playbook) return null;

    const execution: PlaybookExecution = {
      id: uuidv4(),
      playbookId: playbook.id,
      startedAt: new Date().toISOString(),
      context,
      currentPhase: 1,
      completedActions: [],
      status: 'running',
    };

    this.executions.push(execution);
    return execution;
  }

  /**
   * Complete an action in the current execution
   */
  completeAction(executionId: string, actionId: string): boolean {
    const execution = this.executions.find(e => e.id === executionId);
    if (!execution || execution.status !== 'running') return false;

    execution.completedActions.push(actionId);

    // Check if current phase is complete
    const playbook = this.playbooks.find(p => p.id === execution.playbookId);
    if (playbook) {
      const currentPhase = playbook.phases.find(p => p.order === execution.currentPhase);
      if (currentPhase) {
        const phaseActions = currentPhase.actions.map(a => a.id);
        const allComplete = phaseActions.every(a => execution.completedActions.includes(a));
        if (allComplete) {
          // Advance to next phase
          const nextPhase = playbook.phases.find(p => p.order === execution.currentPhase + 1);
          if (nextPhase) {
            execution.currentPhase = nextPhase.order;
          } else {
            execution.status = 'completed';
          }
        }
      }
    }

    return true;
  }

  /**
   * Get all registered playbooks
   */
  getPlaybooks(): Playbook[] {
    return [...this.playbooks];
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): PlaybookExecution[] {
    return this.executions.filter(e => e.status === 'running');
  }

  /**
   * Register a custom playbook
   */
  registerPlaybook(playbook: Playbook): void {
    this.playbooks.push(playbook);
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private evaluateTriggers(playbook: Playbook, context: PlaybookExecutionContext): number {
    let matchedConditions = 0;

    for (const condition of playbook.triggerConditions) {
      const contextValue = this.resolveField(condition.field, context);
      if (contextValue === undefined) continue;

      let matched = false;
      switch (condition.operator) {
        case 'eq':
          matched = String(contextValue) === String(condition.value);
          break;
        case 'gt':
          matched = typeof contextValue === 'number' && contextValue > Number(condition.value);
          break;
        case 'contains':
          matched = typeof contextValue === 'string' && contextValue.includes(String(condition.value));
          break;
        case 'in':
          matched = Array.isArray(condition.value) && condition.value.includes(String(contextValue));
          break;
      }

      if (matched) matchedConditions++;
    }

    return playbook.triggerConditions.length > 0
      ? matchedConditions / playbook.triggerConditions.length
      : 0;
  }

  private resolveField(field: string, context: PlaybookExecutionContext): string | number | boolean | undefined {
    const record = context as unknown as Record<string, string | number | boolean>;
    return record[field];
  }
}
