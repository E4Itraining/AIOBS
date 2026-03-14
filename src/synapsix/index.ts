/**
 * Synapsix — Post-Deployment AI Threat Detection
 * Semantic drift detection, MITRE ICS correlation, IT/OT correlation, playbooks
 */

export { MitreICSCorrelator } from './mitre-ics-correlator';
export type {
  MitreCorrelationResult,
  AnomalySignal,
  COMCYBERPlaybook,
  CorrelationStep,
  MitreTactic,
  MitreTechnique,
} from './mitre-ics-correlator';

export { ITOTCorrelator } from './it-ot-correlator';
export type {
  ITSignal,
  OTSignal,
  SemanticSignal,
  CorrelationEvent,
  AttackChainStep,
  ITOTCorrelatorConfig,
} from './it-ot-correlator';

export { SemanticAlertEngine } from './semantic-alert-engine';
export type {
  SynapsixAlert,
  SemanticAlertConfig,
  AlertCategory,
} from './semantic-alert-engine';

export { PlaybookEngine } from './playbook-engine';
export type {
  Playbook,
  PlaybookPhase,
  PlaybookAction,
  PlaybookExecutionContext,
  PlaybookExecution,
} from './playbook-engine';
