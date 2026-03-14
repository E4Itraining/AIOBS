/**
 * Semantic Drift Detection Engine Tests
 */
import { describe, it, expect } from '@jest/globals';
import { SemanticDriftEngine, InferenceRecord } from '../core/cognitive/semantic-drift/semantic-drift-engine';
import { SemanticContextAnalyzer } from '../core/cognitive/semantic-drift/semantic-context-analyzer';
import { SemanticAlertGenerator } from '../core/cognitive/semantic-drift/semantic-alert';

// ============================================================================
// Test Data Generators
// ============================================================================

function generateInferences(
  count: number,
  featureCount: number,
  options: {
    baseMean?: number;
    baseStd?: number;
    confidenceBase?: number;
    outputLabel?: string;
    startTime?: number;
  } = {}
): InferenceRecord[] {
  const {
    baseMean = 0,
    baseStd = 1,
    confidenceBase = 0.85,
    outputLabel = 'normal',
    startTime = Date.now() - count * 1000,
  } = options;

  return Array.from({ length: count }, (_, i) => ({
    id: `inf-${i}`,
    timestamp: new Date(startTime + i * 1000).toISOString(),
    features: Array.from({ length: featureCount }, () =>
      baseMean + (Math.random() - 0.5) * 2 * baseStd
    ),
    output: outputLabel,
    confidence: Math.min(1, Math.max(0, confidenceBase + (Math.random() - 0.5) * 0.1)),
    operationalLabel: outputLabel,
    featureNames: Array.from({ length: featureCount }, (_, f) => `feature_${f}`),
  }));
}

function generateDriftedInferences(
  count: number,
  featureCount: number,
  driftType: 'semantic' | 'statistical' | 'both'
): InferenceRecord[] {
  if (driftType === 'statistical') {
    // Statistical drift: features shift but labels stay consistent
    return generateInferences(count, featureCount, {
      baseMean: 3, // Shifted mean
      baseStd: 2,  // Wider distribution
      confidenceBase: 0.7,
      outputLabel: 'normal',
    });
  }

  if (driftType === 'semantic') {
    // Semantic drift: features stay normal but meaning changes
    // This is the stealth attack scenario
    const inferences = generateInferences(count, featureCount, {
      baseMean: 0,    // Normal mean
      baseStd: 1,     // Normal distribution
      confidenceBase: 0.88, // Even slightly higher confidence
    });
    // Change operational labels while keeping stats normal
    return inferences.map((inf, i) => ({
      ...inf,
      output: i % 3 === 0 ? 'compromised' : 'normal',
      operationalLabel: i % 3 === 0 ? 'compromised' : 'normal',
    }));
  }

  // Both: statistical + semantic
  return generateInferences(count, featureCount, {
    baseMean: 2,
    baseStd: 1.5,
    confidenceBase: 0.65,
    outputLabel: 'anomalous',
  });
}

// ============================================================================
// SemanticDriftEngine Tests
// ============================================================================

describe('SemanticDriftEngine', () => {
  const engine = new SemanticDriftEngine();

  describe('analyze()', () => {
    it('should return no drift for identical distributions', async () => {
      const reference = generateInferences(100, 5);
      const current = generateInferences(100, 5);

      const result = await engine.analyze({
        modelId: 'test-model',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
      });

      expect(result.modelId).toBe('test-model');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.overallScore.value).toBeLessThan(0.5);
      expect(result.evidence).toBeDefined();
      expect(result.evidence.exportable).toBe(true);
    });

    it('should detect statistical drift', async () => {
      const reference = generateInferences(100, 5);
      const current = generateDriftedInferences(100, 5, 'statistical');

      const result = await engine.analyze({
        modelId: 'test-model',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
      });

      expect(result.isolationForest.anomalyScore).toBeGreaterThan(0);
      expect(result.vaeAnalysis.reconstructionError).toBeGreaterThan(0);
    });

    it('should detect semantic drift (stealth attack)', async () => {
      const reference = generateInferences(100, 5);
      const current = generateDriftedInferences(100, 5, 'semantic');

      const result = await engine.analyze({
        modelId: 'test-model',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
        operationalContext: {
          domain: 'threat_detection',
          expectedCategories: ['normal', 'threat'],
          safetyCritical: true,
          environment: 'production',
        },
      });

      // The key insight: semantic drift should be detected
      // even when statistical distributions are normal
      expect(result.contextAnalysis).toBeDefined();
      expect(result.contextAnalysis.domainCoherence).toBeDefined();
    });

    it('should handle empty input gracefully', async () => {
      const result = await engine.analyze({
        modelId: 'empty-model',
        modelVersion: '1.0',
        inferences: [],
        referenceInferences: [],
      });

      expect(result.driftDetected).toBe(false);
      expect(result.overallScore.value).toBe(0);
      expect(result.overallScore.severity).toBe('info');
      expect(result.alerts).toHaveLength(0);
    });

    it('should generate evidence chain', async () => {
      const reference = generateInferences(50, 3);
      const current = generateInferences(50, 3);

      const result = await engine.analyze({
        modelId: 'evidence-model',
        modelVersion: '2.0',
        inferences: current,
        referenceInferences: reference,
      });

      expect(result.evidence.chainId).toBeDefined();
      expect(result.evidence.modelId).toBe('evidence-model');
      expect(result.evidence.detectionPipeline).toHaveLength(3);
      expect(result.evidence.detectionPipeline[0].step).toBe('isolation_forest');
      expect(result.evidence.detectionPipeline[1].step).toBe('vae_analysis');
      expect(result.evidence.detectionPipeline[2].step).toBe('context_analysis');
      expect(result.evidence.dataFingerprints).toHaveLength(2);
      expect(result.evidence.modelState.version).toBe('2.0');
    });

    it('should produce recommended actions', async () => {
      const reference = generateInferences(100, 5);
      const current = generateDriftedInferences(100, 5, 'both');

      const result = await engine.analyze({
        modelId: 'action-model',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
        operationalContext: {
          domain: 'scada_monitoring',
          expectedCategories: ['normal'],
          safetyCritical: true,
          environment: 'production',
        },
      });

      expect(result.recommendedActions.length).toBeGreaterThan(0);
      for (const action of result.recommendedActions) {
        expect(action.type).toBeDefined();
        expect(action.priority).toBeDefined();
        expect(action.description).toBeTruthy();
      }
    });
  });

  describe('Isolation Forest', () => {
    it('should compute feature contributions', async () => {
      const reference = generateInferences(100, 4);
      const current = generateInferences(100, 4);

      const result = await engine.analyze({
        modelId: 'if-test',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
      });

      expect(result.isolationForest.featureContributions).toHaveLength(4);
      for (const contrib of result.isolationForest.featureContributions) {
        expect(contrib.featureName).toBeDefined();
        expect(contrib.contribution).toBeGreaterThanOrEqual(0);
        expect(contrib.contribution).toBeLessThanOrEqual(1);
        expect(contrib.isolationDepth).toBeGreaterThan(0);
      }
    });

    it('should detect anomaly clusters', async () => {
      const reference = generateInferences(100, 3, { baseMean: 0, baseStd: 0.5 });
      const current = generateInferences(100, 3, { baseMean: 5, baseStd: 0.5 });

      const result = await engine.analyze({
        modelId: 'cluster-test',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
      });

      expect(result.isolationForest.totalSamples).toBe(100);
      // With shifted mean, we should see anomalies
      expect(result.isolationForest.anomalyScore).toBeGreaterThan(0);
    });
  });

  describe('VAE Analysis', () => {
    it('should compute latent dimension analysis', async () => {
      const reference = generateInferences(50, 5);
      const current = generateInferences(50, 5);

      const result = await engine.analyze({
        modelId: 'vae-test',
        modelVersion: '1.0',
        inferences: current,
        referenceInferences: reference,
      });

      expect(result.vaeAnalysis.latentDimensions.length).toBeGreaterThan(0);
      expect(result.vaeAnalysis.reconstructionError).toBeGreaterThanOrEqual(0);
      expect(result.vaeAnalysis.klDivergence).toBeGreaterThanOrEqual(0);
      expect(result.vaeAnalysis.embeddingDistance).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// SemanticContextAnalyzer Tests
// ============================================================================

describe('SemanticContextAnalyzer', () => {
  const analyzer = new SemanticContextAnalyzer({
    isolationForest: { nEstimators: 100, contamination: 0.1, maxSamples: 256, windowSize: 1000 },
    vae: { latentDimensions: 8, reconstructionThreshold: 2.0, klThreshold: 1.0, embeddingDistanceThreshold: 3.0 },
    contextAnalyzer: {
      domainCoherenceThreshold: 0.7,
      temporalConsistencyWindow: { duration: 1, unit: 'hours' },
      decisionBoundaryTolerance: 0.15,
    },
    alerting: { criticalThreshold: 0.8, highThreshold: 0.6, mediumThreshold: 0.35, minConfidence: 0.5 },
    evidence: { enabled: true, retentionDays: 365, autoExport: false },
  });

  it('should identify statistically normal distribution', () => {
    const reference = generateInferences(100, 3);
    const current = generateInferences(100, 3);

    const result = analyzer.analyze(current, reference);

    expect(result.statisticallyNormal).toBe(true);
  });

  it('should compute domain coherence', () => {
    const reference = generateInferences(100, 3, { outputLabel: 'normal' });
    const current = generateInferences(100, 3, { outputLabel: 'normal' });

    const result = analyzer.analyze(current, reference);

    expect(result.domainCoherence).toBeGreaterThan(0);
    expect(result.domainCoherence).toBeLessThanOrEqual(1);
  });

  it('should detect semantic shift when labels change but stats stay normal', () => {
    const reference = generateInferences(100, 3, { outputLabel: 'normal' });
    const current = generateDriftedInferences(100, 3, 'semantic');

    const result = analyzer.analyze(current, reference, {
      domain: 'threat_detection',
      expectedCategories: ['normal'],
      safetyCritical: true,
      environment: 'production',
    });

    // With 1/3 of labels changed to 'compromised', coherence should drop
    expect(result.domainCoherence).toBeLessThan(1);
  });

  it('should handle empty inputs', () => {
    const result = analyzer.analyze([], []);

    expect(result.statisticallyNormal).toBe(true);
    expect(result.semanticallyShifted).toBe(false);
    expect(result.domainCoherence).toBe(1);
  });

  it('should compute temporal consistency', () => {
    const current = generateInferences(100, 3);
    const reference = generateInferences(100, 3);

    const result = analyzer.analyze(current, reference);

    expect(result.temporalConsistency).toBeGreaterThan(0);
    expect(result.temporalConsistency).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// SemanticAlertGenerator Tests
// ============================================================================

describe('SemanticAlertGenerator', () => {
  const generator = new SemanticAlertGenerator({
    isolationForest: { nEstimators: 100, contamination: 0.1, maxSamples: 256, windowSize: 1000 },
    vae: { latentDimensions: 8, reconstructionThreshold: 2.0, klThreshold: 1.0, embeddingDistanceThreshold: 3.0 },
    contextAnalyzer: {
      domainCoherenceThreshold: 0.7,
      temporalConsistencyWindow: { duration: 1, unit: 'hours' },
      decisionBoundaryTolerance: 0.15,
    },
    alerting: { criticalThreshold: 0.8, highThreshold: 0.6, mediumThreshold: 0.35, minConfidence: 0.3 },
    evidence: { enabled: true, retentionDays: 365, autoExport: false },
  });

  it('should generate critical alert for stealth semantic attack', () => {
    const alerts = generator.generateAlerts(
      'test-model',
      {
        anomalyScore: 0.4,
        anomalousCount: 10,
        totalSamples: 100,
        anomalyRate: 0.1,
        contaminationThreshold: 0.1,
        featureContributions: [],
        clusters: [],
      },
      {
        reconstructionError: 1.5,
        reconstructionThreshold: 2.0,
        isAnomalous: false,
        latentSpaceDrift: 0.2,
        latentDimensions: [],
        klDivergence: 0.5,
        klThreshold: 1.0,
        embeddingDistance: 1.0,
        embeddingDistanceThreshold: 3.0,
      },
      {
        statisticallyNormal: true,
        semanticallyShifted: true,
        domainCoherence: 0.4,
        decisionBoundaryShift: 0.3,
        actionMappingConsistency: 0.5,
        temporalConsistency: 0.8,
        detectedShifts: [{
          id: 'shift-1',
          timestamp: new Date().toISOString(),
          shiftType: 'boundary_erosion',
          magnitude: 0.3,
          confidence: 0.8,
          affectedOutputs: ['classification'],
          description: 'Boundary erosion detected',
          adversarialIndicator: true,
        }],
        statisticalSemanticCorrelation: 0.1,
      },
      { value: 0.85, severity: 'critical', confidence: 0.9 }
    );

    expect(alerts.length).toBeGreaterThan(0);
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    expect(criticalAlerts.length).toBeGreaterThan(0);
    expect(criticalAlerts[0].category).toBe('adversarial_semantic_shift');
    expect(criticalAlerts[0].evidence).toBeDefined();
    expect(criticalAlerts[0].evidence.chainId).toBeDefined();
  });

  it('should not generate alerts when no drift detected', () => {
    const alerts = generator.generateAlerts(
      'clean-model',
      {
        anomalyScore: 0.05,
        anomalousCount: 1,
        totalSamples: 100,
        anomalyRate: 0.01,
        contaminationThreshold: 0.1,
        featureContributions: [],
        clusters: [],
      },
      {
        reconstructionError: 0.5,
        reconstructionThreshold: 2.0,
        isAnomalous: false,
        latentSpaceDrift: 0.05,
        latentDimensions: [],
        klDivergence: 0.1,
        klThreshold: 1.0,
        embeddingDistance: 0.3,
        embeddingDistanceThreshold: 3.0,
      },
      {
        statisticallyNormal: true,
        semanticallyShifted: false,
        domainCoherence: 0.95,
        decisionBoundaryShift: 0.02,
        actionMappingConsistency: 0.98,
        temporalConsistency: 0.99,
        detectedShifts: [],
        statisticalSemanticCorrelation: 0.9,
      },
      { value: 0.1, severity: 'info', confidence: 0.3 }
    );

    const criticalOrHigh = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    expect(criticalOrHigh).toHaveLength(0);
  });

  it('should include evidence in all alerts', () => {
    const alerts = generator.generateAlerts(
      'evidence-model',
      {
        anomalyScore: 0.5,
        anomalousCount: 20,
        totalSamples: 100,
        anomalyRate: 0.2,
        contaminationThreshold: 0.1,
        featureContributions: [],
        clusters: [{ id: 'c1', size: 5, centroid: [0], avgAnomalyScore: 0.6, firstSeen: '', lastSeen: '' }],
      },
      {
        reconstructionError: 3.0,
        reconstructionThreshold: 2.0,
        isAnomalous: true,
        latentSpaceDrift: 0.5,
        latentDimensions: [{ dimension: 0, meanShift: 1.5, varianceRatio: 2.0, isSignificant: true }],
        klDivergence: 2.0,
        klThreshold: 1.0,
        embeddingDistance: 4.0,
        embeddingDistanceThreshold: 3.0,
      },
      {
        statisticallyNormal: false,
        semanticallyShifted: true,
        domainCoherence: 0.3,
        decisionBoundaryShift: 0.5,
        actionMappingConsistency: 0.3,
        temporalConsistency: 0.5,
        detectedShifts: [],
        statisticalSemanticCorrelation: 0.2,
      },
      { value: 0.9, severity: 'critical', confidence: 0.95 }
    );

    for (const alert of alerts) {
      expect(alert.evidence).toBeDefined();
      expect(alert.evidence.chainId).toBeDefined();
      expect(alert.evidence.detectionTimeline.length).toBeGreaterThan(0);
    }
  });
});
