/**
 * Semantic Alert Generator
 *
 * Generates contextualized alerts with confidence scores from semantic drift
 * detection results. Each alert includes evidence for AI Act traceability.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SemanticAlert,
  SemanticAlertCategory,
  SemanticDetectionSource,
  OperationalImpact,
  AlertEvidence,
  IsolationForestResult,
  VAEAnalysisResult,
  SemanticContextResult,
  SemanticDriftConfig,
} from '../../types/semantic-drift';
import { SeverityScore, NormalizedScore } from '../../types/common';

export class SemanticAlertGenerator {
  private config: SemanticDriftConfig;

  constructor(config: SemanticDriftConfig) {
    this.config = config;
  }

  /**
   * Generate alerts from semantic drift analysis results
   */
  generateAlerts(
    modelId: string,
    ifResult: IsolationForestResult,
    vaeResult: VAEAnalysisResult,
    contextResult: SemanticContextResult,
    overallScore: SeverityScore
  ): SemanticAlert[] {
    const alerts: SemanticAlert[] = [];
    const timestamp = new Date().toISOString();

    // Critical: Stealth semantic attack (statistically normal but semantically shifted)
    if (contextResult.statisticallyNormal && contextResult.semanticallyShifted) {
      alerts.push(this.createAlert(
        modelId, timestamp,
        'critical',
        'adversarial_semantic_shift',
        'Stealth Semantic Attack Detected',
        `Model ${modelId} shows normal statistical distribution but operational meaning has shifted. ` +
        `Domain coherence: ${(contextResult.domainCoherence * 100).toFixed(1)}%. ` +
        `This pattern is consistent with adversarial semantic manipulation.`,
        this.computeConfidence(ifResult, vaeResult, contextResult),
        this.getDetectionSources(ifResult, vaeResult, contextResult),
        this.assessOperationalImpact(contextResult, overallScore)
      ));
    }

    // High: Isolation Forest anomaly cluster detected
    if (ifResult.clusters.length > 0 && ifResult.anomalyRate > 0.15) {
      alerts.push(this.createAlert(
        modelId, timestamp,
        ifResult.anomalyRate > 0.3 ? 'critical' : 'high',
        'adversarial_semantic_shift',
        'Inference Stream Anomaly Clusters',
        `${ifResult.clusters.length} anomaly cluster(s) detected in inference stream. ` +
        `Anomaly rate: ${(ifResult.anomalyRate * 100).toFixed(1)}%. ` +
        `${ifResult.anomalousCount}/${ifResult.totalSamples} samples flagged.`,
        ifResult.anomalyScore,
        ['isolation_forest'],
        {
          affectedSystems: [modelId],
          severity: ifResult.anomalyRate > 0.3 ? 'mission_critical' : 'operational',
          safetyCritical: false,
          immediateActions: ['Increase monitoring frequency', 'Compare with known-good baseline'],
        }
      ));
    }

    // High: VAE latent space drift
    if (vaeResult.isAnomalous) {
      const significantDims = vaeResult.latentDimensions.filter(d => d.isSignificant);
      alerts.push(this.createAlert(
        modelId, timestamp,
        vaeResult.reconstructionError > this.config.vae.reconstructionThreshold * 1.5 ? 'critical' : 'high',
        'gradual_meaning_drift',
        'Latent Space Semantic Drift',
        `VAE reconstruction error (${vaeResult.reconstructionError.toFixed(3)}) exceeds threshold ` +
        `(${vaeResult.reconstructionThreshold}). KL divergence: ${vaeResult.klDivergence.toFixed(3)}. ` +
        `${significantDims.length} latent dimensions significantly shifted.`,
        Math.min(1, vaeResult.reconstructionError / (vaeResult.reconstructionThreshold * 2)),
        ['vae_reconstruction'],
        {
          affectedSystems: [modelId],
          severity: 'operational',
          safetyCritical: false,
          immediateActions: ['Review model output quality', 'Check for data pipeline changes'],
        }
      ));
    }

    // Medium: Decision boundary compromise
    if (contextResult.decisionBoundaryShift > this.config.contextAnalyzer.decisionBoundaryTolerance) {
      alerts.push(this.createAlert(
        modelId, timestamp,
        contextResult.decisionBoundaryShift > 0.5 ? 'high' : 'medium',
        'decision_boundary_compromise',
        'Decision Boundary Shift Detected',
        `Decision boundary shifted by ${(contextResult.decisionBoundaryShift * 100).toFixed(1)}% ` +
        `(tolerance: ${(this.config.contextAnalyzer.decisionBoundaryTolerance * 100).toFixed(1)}%). ` +
        `This may alter classification outcomes without changing overall distribution.`,
        contextResult.decisionBoundaryShift,
        ['context_analyzer'],
        {
          affectedSystems: [modelId],
          severity: 'operational',
          safetyCritical: false,
          immediateActions: ['Validate classification accuracy on critical samples'],
        }
      ));
    }

    // Medium: Context integrity violation
    for (const shift of contextResult.detectedShifts) {
      if (shift.shiftType === 'confidence_manipulation' && shift.magnitude > 0.3) {
        alerts.push(this.createAlert(
          modelId, timestamp,
          shift.adversarialIndicator ? 'high' : 'medium',
          'confidence_calibration_attack',
          'Confidence Score Manipulation Suspected',
          shift.description,
          shift.confidence,
          ['context_analyzer', 'temporal_correlation'],
          {
            affectedSystems: [modelId],
            severity: shift.adversarialIndicator ? 'mission_critical' : 'operational',
            safetyCritical: shift.adversarialIndicator,
            immediateActions: ['Recalibrate confidence scores', 'Check for adversarial inputs'],
          }
        ));
      }
    }

    // Low: Domain coherence degradation (early warning)
    if (contextResult.domainCoherence < 0.85 && contextResult.domainCoherence >= this.config.contextAnalyzer.domainCoherenceThreshold) {
      alerts.push(this.createAlert(
        modelId, timestamp,
        'low',
        'operational_coherence_loss',
        'Domain Coherence Degrading',
        `Domain coherence at ${(contextResult.domainCoherence * 100).toFixed(1)}% — ` +
        `approaching threshold of ${(this.config.contextAnalyzer.domainCoherenceThreshold * 100).toFixed(1)}%.`,
        contextResult.domainCoherence,
        ['context_analyzer'],
        {
          affectedSystems: [modelId],
          severity: 'informational',
          safetyCritical: false,
          immediateActions: ['Monitor trend', 'Prepare baseline refresh if needed'],
        }
      ));
    }

    // Filter by minimum confidence
    return alerts.filter(a => a.confidenceScore >= this.config.alerting.minConfidence);
  }

  private createAlert(
    modelId: string,
    timestamp: string,
    severity: SemanticAlert['severity'],
    category: SemanticAlertCategory,
    title: string,
    description: string,
    confidenceScore: NormalizedScore,
    detectionSources: SemanticDetectionSource[],
    operationalImpact: OperationalImpact
  ): SemanticAlert {
    const alertId = uuidv4();

    return {
      id: alertId,
      timestamp,
      modelId,
      severity,
      category,
      title,
      description,
      confidenceScore: Math.min(1, Math.max(0, confidenceScore)),
      detectionSources,
      operationalImpact,
      evidence: {
        chainId: alertId,
        detectionTimeline: [
          { stage: 'detection', timestamp },
          { stage: 'analysis', timestamp: new Date().toISOString() },
          { stage: 'alert_generation', timestamp: new Date().toISOString() },
        ],
        triggeringMetrics: {},
        modelStateHash: this.simpleHash(modelId + timestamp),
        exportFormat: 'json',
      },
      acknowledged: false,
    };
  }

  private computeConfidence(
    ifResult: IsolationForestResult,
    vaeResult: VAEAnalysisResult,
    contextResult: SemanticContextResult
  ): NormalizedScore {
    let confidence = 0;

    // More detection sources agreeing = higher confidence
    let sourcesAgreeing = 0;
    if (ifResult.anomalyScore > 0.3) sourcesAgreeing++;
    if (vaeResult.isAnomalous) sourcesAgreeing++;
    if (contextResult.semanticallyShifted) sourcesAgreeing++;

    confidence = sourcesAgreeing / 3;

    // Boost if statistically normal but semantically shifted (strong indicator)
    if (contextResult.statisticallyNormal && contextResult.semanticallyShifted) {
      confidence = Math.min(1, confidence + 0.2);
    }

    return confidence;
  }

  private getDetectionSources(
    ifResult: IsolationForestResult,
    vaeResult: VAEAnalysisResult,
    contextResult: SemanticContextResult
  ): SemanticDetectionSource[] {
    const sources: SemanticDetectionSource[] = [];
    if (ifResult.anomalyScore > 0.2) sources.push('isolation_forest');
    if (vaeResult.isAnomalous) sources.push('vae_reconstruction');
    if (contextResult.semanticallyShifted) sources.push('context_analyzer');
    if (contextResult.detectedShifts.length > 0) sources.push('temporal_correlation');
    return sources.length > 0 ? sources : ['context_analyzer'];
  }

  private assessOperationalImpact(
    contextResult: SemanticContextResult,
    overallScore: SeverityScore
  ): OperationalImpact {
    const isCritical = overallScore.severity === 'critical';
    const hasAdversarial = contextResult.detectedShifts.some(s => s.adversarialIndicator);

    return {
      affectedSystems: contextResult.detectedShifts.flatMap(s => s.affectedOutputs),
      severity: isCritical || hasAdversarial ? 'mission_critical' : 'operational',
      safetyCritical: hasAdversarial,
      immediateActions: isCritical
        ? ['Quarantine model', 'Alert SOC', 'Activate fallback model', 'Preserve evidence']
        : ['Increase monitoring', 'Investigate root cause', 'Prepare rollback plan'],
    };
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
