/**
 * AIOBS - AI Observability Hub
 * Trust Control Layer for AI Systems
 *
 * @packageDocumentation
 */

// Core Types
export * from './core/types';

// Cognitive Metrics Engine
export * from './core/cognitive';

// Causal Analysis Engine
export * from './core/causal';

// Governance
export * from './governance/audit';
export * from './governance/slo';

// Storage Backends
export * from './storage';

// Version
export const VERSION = '1.0.0';

/**
 * AIOBS Platform Entry Point
 *
 * The AI Observability Hub provides:
 * - End-to-end visibility over AI systems
 * - Cognitive metrics (drift, reliability, hallucination, degradation)
 * - Causal analysis linking infrastructure, data, and AI outcomes
 * - Governance by design aligned with AI Act
 * - Multi-view dashboards for all stakeholders
 *
 * @example
 * ```typescript
 * import { CognitiveMetricsEngine, CausalEngine, AuditEngine } from '@aiobs/platform';
 *
 * // Initialize engines
 * const cognitiveEngine = new CognitiveMetricsEngine();
 * const causalEngine = new CausalEngine();
 * const auditEngine = new AuditEngine();
 *
 * // Compute cognitive metrics for a model
 * const metrics = await cognitiveEngine.computeSnapshot('model-123', data);
 *
 * // Analyze root cause of an incident
 * const graph = await causalEngine.buildGraph(events, scope);
 * const rootCause = await causalEngine.analyzeRootCause(graph, incidentId);
 *
 * // Log auditable actions
 * await auditEngine.logModelDeployment(actor, modelId, version, env, outcome, context);
 * ```
 */
export class AIOBS {
  static readonly VERSION = VERSION;

  /**
   * Create a new AIOBS platform instance with all engines
   */
  static create(config?: AIBOSConfig): AIBOSInstance {
    // Import engines dynamically to avoid circular dependencies
    const { CognitiveMetricsEngine } = require('./core/cognitive/cognitive-engine');
    const { CausalEngine } = require('./core/causal/causal-engine');
    const { AuditEngine } = require('./governance/audit/audit-engine');
    const { SLOMonitor } = require('./governance/slo/slo-monitor');

    const instance: AIBOSInstance = {
      cognitive: new CognitiveMetricsEngine(config?.cognitive),
      causal: new CausalEngine(config?.causal),
      audit: new AuditEngine(config?.audit),
      slo: new SLOMonitor(config?.slo),
    };

    // Initialize storage backend if configured
    if (config?.storage?.victoriaMetricsUrl && config?.storage?.openObserveUrl) {
      const { createAIOBSStorageBackend } = require('./storage');
      instance.storage = createAIOBSStorageBackend({
        victoriaMetricsUrl: config.storage.victoriaMetricsUrl,
        openObserveUrl: config.storage.openObserveUrl,
        openObserveOrg: config.storage.openObserveOrg || 'default',
        openObserveUser: config.storage.openObserveUser || 'admin',
        openObservePassword: config.storage.openObservePassword || '',
        vmTenantId: config.storage.vmTenantId,
      });
    }

    return instance;
  }
}

/**
 * AIOBS configuration
 */
export interface AIBOSConfig {
  cognitive?: any;
  causal?: any;
  audit?: any;
  slo?: any;
  /** Storage backend configuration */
  storage?: {
    /** VictoriaMetrics URL for metrics */
    victoriaMetricsUrl?: string;
    /** VictoriaMetrics tenant ID */
    vmTenantId?: string;
    /** OpenObserve URL for logs/traces */
    openObserveUrl?: string;
    /** OpenObserve organization */
    openObserveOrg?: string;
    /** OpenObserve username */
    openObserveUser?: string;
    /** OpenObserve password */
    openObservePassword?: string;
  };
}

/**
 * AIOBS instance with all engines
 */
export interface AIBOSInstance {
  cognitive: any;
  causal: any;
  audit: any;
  slo: any;
  /** Storage backend (if configured) */
  storage?: any;
}
