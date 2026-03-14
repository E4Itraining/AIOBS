/**
 * Semantic Drift Detection Engine
 *
 * Core detector combining Isolation Forest anomaly detection and VAE-based
 * reconstruction analysis on inference streams. Detects when a model's outputs
 * remain within statistical bounds but their operational meaning has shifted.
 *
 * This is the differentiating module — a model can pass all classical drift
 * tests while being semantically compromised (adversarial semantic shift).
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SemanticDriftAnalysis,
  IsolationForestResult,
  VAEAnalysisResult,
  FeatureAnomalyContribution,
  AnomalyCluster,
  LatentDimensionAnalysis,
  SemanticDriftAction,
  SemanticDriftEvidence,
  DetectionPipelineStep,
  DataFingerprint,
  ModelStateSnapshot,
  SemanticDriftConfig,
} from '../../types/semantic-drift';
import { SeverityScore, NormalizedScore } from '../../types/common';
import { SemanticContextAnalyzer } from './semantic-context-analyzer';
import { SemanticAlertGenerator } from './semantic-alert';

/** Input data for semantic drift analysis */
export interface SemanticDriftInput {
  modelId: string;
  modelVersion: string;
  /** Inference stream: recent model outputs with features */
  inferences: InferenceRecord[];
  /** Reference baseline inferences (known-good period) */
  referenceInferences: InferenceRecord[];
  /** Operational context metadata */
  operationalContext?: OperationalContext;
}

export interface InferenceRecord {
  id: string;
  timestamp: string;
  /** Input features as numeric vector */
  features: number[];
  /** Model output (prediction/classification) */
  output: number | string;
  /** Output confidence */
  confidence: number;
  /** Operational label (what the output means in context) */
  operationalLabel?: string;
  /** Feature names for interpretability */
  featureNames?: string[];
}

export interface OperationalContext {
  /** Domain of operation (e.g., 'scada_monitoring', 'threat_detection') */
  domain: string;
  /** Expected output categories */
  expectedCategories: string[];
  /** Safety-critical flag */
  safetyCritical: boolean;
  /** Deployment environment */
  environment: 'production' | 'staging' | 'edge';
}

/**
 * Semantic Drift Detection Engine
 *
 * Combines Isolation Forest (anomaly detection on feature space) and
 * VAE analysis (reconstruction error on output distributions) to detect
 * semantic shifts that classical statistical tests miss.
 */
export class SemanticDriftEngine {
  private config: SemanticDriftConfig;
  private contextAnalyzer: SemanticContextAnalyzer;
  private alertGenerator: SemanticAlertGenerator;

  constructor(config?: Partial<SemanticDriftConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.contextAnalyzer = new SemanticContextAnalyzer(this.config);
    this.alertGenerator = new SemanticAlertGenerator(this.config);
  }

  /**
   * Run full semantic drift analysis on inference stream
   */
  async analyze(input: SemanticDriftInput): Promise<SemanticDriftAnalysis> {
    const timestamp = new Date().toISOString();
    const analysisId = uuidv4();

    const pipelineSteps: DetectionPipelineStep[] = [];

    // Step 1: Isolation Forest anomaly detection
    const ifStart = Date.now();
    const isolationForest = this.runIsolationForest(
      input.inferences,
      input.referenceInferences
    );
    pipelineSteps.push({
      step: 'isolation_forest',
      timestamp: new Date().toISOString(),
      input: `${input.inferences.length} inferences`,
      output: `anomaly_score=${isolationForest.anomalyScore.toFixed(4)}`,
      confidence: isolationForest.anomalyScore,
    });

    // Step 2: VAE reconstruction analysis
    const vaeAnalysis = this.runVAEAnalysis(
      input.inferences,
      input.referenceInferences
    );
    pipelineSteps.push({
      step: 'vae_analysis',
      timestamp: new Date().toISOString(),
      input: `${input.inferences.length} inferences`,
      output: `reconstruction_error=${vaeAnalysis.reconstructionError.toFixed(4)}, kl_div=${vaeAnalysis.klDivergence.toFixed(4)}`,
      confidence: vaeAnalysis.isAnomalous ? 0.9 : 0.1,
    });

    // Step 3: Semantic context analysis
    const contextAnalysis = this.contextAnalyzer.analyze(
      input.inferences,
      input.referenceInferences,
      input.operationalContext
    );
    pipelineSteps.push({
      step: 'context_analysis',
      timestamp: new Date().toISOString(),
      input: `domain=${input.operationalContext?.domain || 'unknown'}`,
      output: `coherence=${contextAnalysis.domainCoherence.toFixed(4)}, shifted=${contextAnalysis.semanticallyShifted}`,
      confidence: contextAnalysis.domainCoherence,
    });

    // Step 4: Compute overall score
    const overallScore = this.computeOverallScore(
      isolationForest,
      vaeAnalysis,
      contextAnalysis
    );
    const driftDetected = overallScore.value > this.config.alerting.mediumThreshold;

    // Step 5: Generate alerts
    const alerts = this.alertGenerator.generateAlerts(
      input.modelId,
      isolationForest,
      vaeAnalysis,
      contextAnalysis,
      overallScore
    );

    // Step 6: Generate actions
    const recommendedActions = this.generateActions(
      overallScore,
      contextAnalysis.semanticallyShifted,
      input.operationalContext?.safetyCritical || false
    );

    // Step 7: Build evidence chain
    const evidence = this.buildEvidence(
      analysisId,
      input,
      pipelineSteps
    );

    return {
      id: analysisId,
      modelId: input.modelId,
      timestamp,
      window: { duration: 1, unit: 'hours' },
      overallScore,
      driftDetected,
      isolationForest,
      vaeAnalysis,
      contextAnalysis,
      alerts,
      recommendedActions,
      evidence,
    };
  }

  /**
   * Isolation Forest anomaly detection on inference feature space.
   *
   * Simulates the algorithm by computing isolation scores based on
   * feature deviation from reference distribution. In production,
   * this would use a trained sklearn-style model.
   */
  private runIsolationForest(
    current: InferenceRecord[],
    reference: InferenceRecord[]
  ): IsolationForestResult {
    if (current.length === 0 || reference.length === 0) {
      return this.emptyIsolationForestResult();
    }

    const featureCount = current[0].features.length;
    const contamination = this.config.isolationForest.contamination;

    // Compute reference statistics per feature
    const refStats = this.computeFeatureStats(reference);

    // Score each current inference by isolation-like metric
    const scores: number[] = current.map(inf => {
      let totalDeviation = 0;
      for (let f = 0; f < featureCount; f++) {
        const val = inf.features[f] || 0;
        const mean = refStats[f]?.mean || 0;
        const std = refStats[f]?.std || 1;
        // Normalized deviation as isolation proxy
        totalDeviation += Math.abs(val - mean) / Math.max(std, 0.001);
      }
      // Average and normalize to [0,1]
      return Math.min(1, (totalDeviation / featureCount) / 3);
    });

    // Determine anomalies
    const threshold = this.computeIsolationThreshold(scores, contamination);
    const anomalousIndices = scores
      .map((s, i) => ({ score: s, index: i }))
      .filter(s => s.score > threshold);

    // Feature contributions
    const featureContributions: FeatureAnomalyContribution[] = [];
    for (let f = 0; f < featureCount; f++) {
      const featureName = current[0].featureNames?.[f] || `feature_${f}`;
      const deviations = current.map(inf => {
        const val = inf.features[f] || 0;
        const mean = refStats[f]?.mean || 0;
        const std = refStats[f]?.std || 1;
        return Math.abs(val - mean) / Math.max(std, 0.001);
      });
      const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
      const contribution = Math.min(1, avgDeviation / 3);

      featureContributions.push({
        featureName,
        contribution,
        isolationDepth: Math.max(1, Math.round(10 * (1 - contribution))),
        isAnomaly: contribution > 0.5,
      });
    }

    // Cluster anomalies by time proximity
    const clusters = this.clusterAnomalies(anomalousIndices, current);

    const anomalyScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      anomalyScore: Math.min(1, anomalyScore),
      anomalousCount: anomalousIndices.length,
      totalSamples: current.length,
      anomalyRate: anomalousIndices.length / Math.max(current.length, 1),
      contaminationThreshold: contamination,
      featureContributions,
      clusters,
    };
  }

  /**
   * VAE (Variational Autoencoder) reconstruction analysis.
   *
   * Simulates VAE by computing reconstruction error as the divergence
   * between current and reference output distributions in a compressed
   * latent space representation.
   */
  private runVAEAnalysis(
    current: InferenceRecord[],
    reference: InferenceRecord[]
  ): VAEAnalysisResult {
    if (current.length === 0 || reference.length === 0) {
      return this.emptyVAEResult();
    }

    const latentDims = this.config.vae.latentDimensions;

    // Simulate latent space encoding by PCA-like projection
    const refEncoded = this.encodeToLatent(reference, latentDims);
    const curEncoded = this.encodeToLatent(current, latentDims);

    // Compute reconstruction error (MSE between projected and original distributions)
    const reconstructionError = this.computeReconstructionError(curEncoded, refEncoded);

    // Compute KL divergence between latent distributions
    const klDivergence = this.computeKLDivergence(curEncoded, refEncoded);

    // Per-dimension analysis
    const latentDimensions: LatentDimensionAnalysis[] = [];
    for (let d = 0; d < latentDims; d++) {
      const refValues = refEncoded.map(e => e[d] || 0);
      const curValues = curEncoded.map(e => e[d] || 0);

      const refMean = this.mean(refValues);
      const curMean = this.mean(curValues);
      const refVar = this.variance(refValues);
      const curVar = this.variance(curValues);

      latentDimensions.push({
        dimension: d,
        meanShift: curMean - refMean,
        varianceRatio: curVar / Math.max(refVar, 0.001),
        isSignificant: Math.abs(curMean - refMean) > 2 * Math.sqrt(refVar + 0.001),
      });
    }

    // Embedding distance from reference centroid
    const refCentroid = this.computeCentroid(refEncoded);
    const curCentroid = this.computeCentroid(curEncoded);
    const embeddingDistance = this.euclideanDistance(refCentroid, curCentroid);

    return {
      reconstructionError,
      reconstructionThreshold: this.config.vae.reconstructionThreshold,
      isAnomalous: reconstructionError > this.config.vae.reconstructionThreshold
        || klDivergence > this.config.vae.klThreshold,
      latentSpaceDrift: Math.min(1, embeddingDistance / 5),
      latentDimensions,
      klDivergence,
      klThreshold: this.config.vae.klThreshold,
      embeddingDistance,
      embeddingDistanceThreshold: this.config.vae.embeddingDistanceThreshold,
    };
  }

  /**
   * Compute overall semantic drift score combining all detection methods
   */
  private computeOverallScore(
    ifResult: IsolationForestResult,
    vaeResult: VAEAnalysisResult,
    contextResult: { domainCoherence: NormalizedScore; semanticallyShifted: boolean; decisionBoundaryShift: NormalizedScore }
  ): SeverityScore {
    // Weighted combination:
    // - Isolation Forest: 0.30 (feature-space anomalies)
    // - VAE: 0.30 (latent-space drift)
    // - Context: 0.40 (operational meaning shift — most important)
    const contextScore = contextResult.semanticallyShifted
      ? Math.max(0.6, 1 - contextResult.domainCoherence)
      : (1 - contextResult.domainCoherence);

    const weightedScore =
      ifResult.anomalyScore * 0.30 +
      (vaeResult.isAnomalous ? Math.min(1, vaeResult.reconstructionError) : vaeResult.reconstructionError * 0.5) * 0.30 +
      contextScore * 0.40;

    const value = Math.min(1, Math.max(0, weightedScore));

    let severity: SeverityScore['severity'];
    if (value >= this.config.alerting.criticalThreshold) severity = 'critical';
    else if (value >= this.config.alerting.highThreshold) severity = 'high';
    else if (value >= this.config.alerting.mediumThreshold) severity = 'medium';
    else if (value >= 0.1) severity = 'low';
    else severity = 'info';

    const confidence = Math.min(1,
      (ifResult.totalSamples > 50 ? 0.4 : 0.2) +
      (vaeResult.latentDimensions.filter(d => d.isSignificant).length > 0 ? 0.3 : 0.1) +
      (contextResult.semanticallyShifted ? 0.3 : 0.1)
    );

    return { value, severity, confidence };
  }

  /**
   * Generate recommended actions based on analysis
   */
  private generateActions(
    score: SeverityScore,
    semanticallyShifted: boolean,
    safetyCritical: boolean
  ): SemanticDriftAction[] {
    const actions: SemanticDriftAction[] = [];

    if (score.severity === 'critical') {
      if (safetyCritical) {
        actions.push({
          type: 'quarantine',
          priority: 'critical',
          description: 'Quarantine model immediately — safety-critical semantic drift detected',
          estimatedImpact: 'Service interruption until model is verified',
          automated: true,
        });
      }
      actions.push({
        type: 'alert_soc',
        priority: 'critical',
        description: 'Alert Security Operations Center — potential adversarial semantic shift',
        estimatedImpact: 'SOC investigation and incident response',
        automated: true,
      });
      actions.push({
        type: 'rollback',
        priority: 'high',
        description: 'Roll back to last known-good model version',
        estimatedImpact: 'Temporary performance regression to restore semantic integrity',
        automated: false,
      });
    } else if (score.severity === 'high') {
      actions.push({
        type: 'alert_soc',
        priority: 'high',
        description: 'Notify SOC of elevated semantic drift indicators',
        estimatedImpact: 'Investigation triggered within SLA',
        automated: true,
      });
      actions.push({
        type: 'investigate',
        priority: 'high',
        description: 'Investigate inference stream for potential compromise patterns',
        estimatedImpact: 'Root cause analysis within 4 hours',
        automated: false,
      });
    } else if (score.severity === 'medium') {
      actions.push({
        type: 'monitor',
        priority: 'medium',
        description: 'Increase monitoring frequency for this model',
        estimatedImpact: 'Early detection of drift escalation',
        automated: true,
      });
      if (semanticallyShifted) {
        actions.push({
          type: 'investigate',
          priority: 'medium',
          description: 'Semantic shift detected despite normal statistics — investigate root cause',
          estimatedImpact: 'May reveal subtle adversarial manipulation',
          automated: false,
        });
      }
    } else {
      actions.push({
        type: 'monitor',
        priority: 'low',
        description: 'Continue standard monitoring — no significant semantic drift',
        estimatedImpact: 'Maintain current model performance',
        automated: true,
      });
    }

    return actions;
  }

  /**
   * Build evidence chain for AI Act compliance traceability
   */
  private buildEvidence(
    analysisId: string,
    input: SemanticDriftInput,
    pipelineSteps: DetectionPipelineStep[]
  ): SemanticDriftEvidence {
    const dataFingerprints: DataFingerprint[] = [
      {
        datasetId: `current_${input.modelId}`,
        hash: this.simpleHash(JSON.stringify(input.inferences.slice(0, 10))),
        sampleCount: input.inferences.length,
        timestamp: new Date().toISOString(),
      },
      {
        datasetId: `reference_${input.modelId}`,
        hash: this.simpleHash(JSON.stringify(input.referenceInferences.slice(0, 10))),
        sampleCount: input.referenceInferences.length,
        timestamp: new Date().toISOString(),
      },
    ];

    const modelState: ModelStateSnapshot = {
      modelId: input.modelId,
      version: input.modelVersion,
      checksum: this.simpleHash(input.modelId + input.modelVersion),
      deploymentTimestamp: new Date().toISOString(),
      configuration: {
        isolationForestEstimators: String(this.config.isolationForest.nEstimators),
        vaeLatentDims: String(this.config.vae.latentDimensions),
        alertingCriticalThreshold: String(this.config.alerting.criticalThreshold),
      },
    };

    return {
      chainId: analysisId,
      modelId: input.modelId,
      analysisTimestamp: new Date().toISOString(),
      detectionPipeline: pipelineSteps,
      dataFingerprints,
      modelState,
      exportable: this.config.evidence.enabled,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private computeFeatureStats(records: InferenceRecord[]): { mean: number; std: number }[] {
    if (records.length === 0) return [];
    const featureCount = records[0].features.length;
    const stats: { mean: number; std: number }[] = [];

    for (let f = 0; f < featureCount; f++) {
      const values = records.map(r => r.features[f] || 0);
      stats.push({ mean: this.mean(values), std: this.stdDev(values) });
    }
    return stats;
  }

  private computeIsolationThreshold(scores: number[], contamination: number): number {
    const sorted = [...scores].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * (1 - contamination));
    return sorted[Math.min(idx, sorted.length - 1)] || 0.5;
  }

  private clusterAnomalies(
    anomalies: { score: number; index: number }[],
    records: InferenceRecord[]
  ): AnomalyCluster[] {
    if (anomalies.length === 0) return [];

    // Simple time-based clustering
    const clusters: AnomalyCluster[] = [];
    let currentCluster: typeof anomalies = [anomalies[0]];

    for (let i = 1; i < anomalies.length; i++) {
      if (anomalies[i].index - anomalies[i - 1].index <= 5) {
        currentCluster.push(anomalies[i]);
      } else {
        clusters.push(this.buildCluster(currentCluster, records));
        currentCluster = [anomalies[i]];
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(this.buildCluster(currentCluster, records));
    }

    return clusters;
  }

  private buildCluster(
    members: { score: number; index: number }[],
    records: InferenceRecord[]
  ): AnomalyCluster {
    const avgScore = members.reduce((s, m) => s + m.score, 0) / members.length;
    const firstRecord = records[members[0].index];
    const lastRecord = records[members[members.length - 1].index];

    return {
      id: uuidv4(),
      size: members.length,
      centroid: firstRecord?.features || [],
      avgAnomalyScore: avgScore,
      firstSeen: firstRecord?.timestamp || new Date().toISOString(),
      lastSeen: lastRecord?.timestamp || new Date().toISOString(),
    };
  }

  private encodeToLatent(records: InferenceRecord[], dims: number): number[][] {
    // Simplified PCA-like projection to simulate VAE encoding
    return records.map(r => {
      const encoded: number[] = [];
      const features = r.features;
      for (let d = 0; d < dims; d++) {
        let val = 0;
        for (let f = 0; f < features.length; f++) {
          // Pseudo-projection using sinusoidal basis
          val += (features[f] || 0) * Math.sin((f + 1) * (d + 1) * 0.5);
        }
        encoded.push(val / Math.max(features.length, 1));
      }
      return encoded;
    });
  }

  private computeReconstructionError(current: number[][], reference: number[][]): number {
    const refCentroid = this.computeCentroid(reference);
    let totalError = 0;
    for (const sample of current) {
      totalError += this.euclideanDistance(sample, refCentroid);
    }
    const avgError = totalError / Math.max(current.length, 1);
    // Normalize against reference spread
    const refSpread = this.computeSpread(reference, refCentroid);
    return avgError / Math.max(refSpread, 0.001);
  }

  private computeKLDivergence(current: number[][], reference: number[][]): number {
    if (current.length === 0 || reference.length === 0) return 0;
    const dims = current[0].length;
    let kl = 0;

    for (let d = 0; d < dims; d++) {
      const curValues = current.map(s => s[d] || 0);
      const refValues = reference.map(s => s[d] || 0);
      const curMean = this.mean(curValues);
      const refMean = this.mean(refValues);
      const curVar = this.variance(curValues) + 0.001;
      const refVar = this.variance(refValues) + 0.001;

      // KL divergence for univariate Gaussians
      kl += 0.5 * (Math.log(refVar / curVar) + curVar / refVar +
        Math.pow(curMean - refMean, 2) / refVar - 1);
    }

    return Math.max(0, kl / dims);
  }

  private computeCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dims = vectors[0].length;
    const centroid = new Array(dims).fill(0);
    for (const v of vectors) {
      for (let d = 0; d < dims; d++) {
        centroid[d] += (v[d] || 0);
      }
    }
    return centroid.map(c => c / vectors.length);
  }

  private computeSpread(vectors: number[][], centroid: number[]): number {
    if (vectors.length === 0) return 1;
    let totalDist = 0;
    for (const v of vectors) {
      totalDist += this.euclideanDistance(v, centroid);
    }
    return totalDist / vectors.length;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow((a[i] || 0) - (b[i] || 0), 2);
    }
    return Math.sqrt(sum);
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private variance(values: number[]): number {
    if (values.length === 0) return 0;
    const m = this.mean(values);
    return values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / values.length;
  }

  private stdDev(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private emptyIsolationForestResult(): IsolationForestResult {
    return {
      anomalyScore: 0,
      anomalousCount: 0,
      totalSamples: 0,
      anomalyRate: 0,
      contaminationThreshold: this.config.isolationForest.contamination,
      featureContributions: [],
      clusters: [],
    };
  }

  private emptyVAEResult(): VAEAnalysisResult {
    return {
      reconstructionError: 0,
      reconstructionThreshold: this.config.vae.reconstructionThreshold,
      isAnomalous: false,
      latentSpaceDrift: 0,
      latentDimensions: [],
      klDivergence: 0,
      klThreshold: this.config.vae.klThreshold,
      embeddingDistance: 0,
      embeddingDistanceThreshold: this.config.vae.embeddingDistanceThreshold,
    };
  }

  private mergeWithDefaults(config?: Partial<SemanticDriftConfig>): SemanticDriftConfig {
    return {
      isolationForest: {
        nEstimators: config?.isolationForest?.nEstimators ?? 100,
        contamination: config?.isolationForest?.contamination ?? 0.1,
        maxSamples: config?.isolationForest?.maxSamples ?? 256,
        windowSize: config?.isolationForest?.windowSize ?? 1000,
      },
      vae: {
        latentDimensions: config?.vae?.latentDimensions ?? 8,
        reconstructionThreshold: config?.vae?.reconstructionThreshold ?? 2.0,
        klThreshold: config?.vae?.klThreshold ?? 1.0,
        embeddingDistanceThreshold: config?.vae?.embeddingDistanceThreshold ?? 3.0,
      },
      contextAnalyzer: {
        domainCoherenceThreshold: config?.contextAnalyzer?.domainCoherenceThreshold ?? 0.7,
        temporalConsistencyWindow: config?.contextAnalyzer?.temporalConsistencyWindow ?? { duration: 1, unit: 'hours' },
        decisionBoundaryTolerance: config?.contextAnalyzer?.decisionBoundaryTolerance ?? 0.15,
      },
      alerting: {
        criticalThreshold: config?.alerting?.criticalThreshold ?? 0.8,
        highThreshold: config?.alerting?.highThreshold ?? 0.6,
        mediumThreshold: config?.alerting?.mediumThreshold ?? 0.35,
        minConfidence: config?.alerting?.minConfidence ?? 0.5,
      },
      evidence: {
        enabled: config?.evidence?.enabled ?? true,
        retentionDays: config?.evidence?.retentionDays ?? 365,
        autoExport: config?.evidence?.autoExport ?? false,
      },
    };
  }
}
