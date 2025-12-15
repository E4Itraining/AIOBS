/**
 * Drift Detector Tests
 * Tests for data drift, concept drift, and prediction drift detection
 */

import { DriftDetector } from '../core/cognitive/drift-detector';
import { CognitiveEngineConfig, CognitiveInputData, FeatureDistribution } from '../core/cognitive/cognitive-engine';

describe('DriftDetector', () => {
  let detector: DriftDetector;
  let defaultConfig: CognitiveEngineConfig;

  beforeEach(() => {
    defaultConfig = {
      driftThreshold: 0.3,
      driftWindow: { duration: 24, unit: 'hours' },
      reliabilityThreshold: 0.7,
      hallucinationThreshold: 0.5,
      degradationThreshold: 0.2,
      enableCaching: false,
      cacheTTL: 300,
    };
    detector = new DriftDetector(defaultConfig);
  });

  describe('Data Drift Detection', () => {
    it('should detect significant data drift when distributions change', async () => {
      const modelId = 'test-model-1';
      const data: CognitiveInputData = {
        modelId,
        referenceData: [
          createFeatureDistribution('feature_1', 50, 10, 0, 100),
          createFeatureDistribution('feature_2', 100, 20, 0, 200),
        ],
        currentData: [
          // Significantly different distribution
          createFeatureDistribution('feature_1', 80, 25, 20, 150),
          createFeatureDistribution('feature_2', 150, 40, 50, 300),
        ],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.modelId).toBe(modelId);
      expect(result.dataDrift).toBeDefined();
      expect(result.dataDrift.featureDrift.length).toBe(2);
      expect(result.dataDrift.score).toBeGreaterThan(0);
    });

    it('should not detect drift when distributions are similar', async () => {
      const modelId = 'test-model-2';
      const data: CognitiveInputData = {
        modelId,
        referenceData: [
          createFeatureDistribution('feature_1', 50, 10, 0, 100),
        ],
        currentData: [
          // Very similar distribution
          createFeatureDistribution('feature_1', 51, 10.5, 0, 100),
        ],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.dataDrift.score).toBeLessThan(defaultConfig.driftThreshold);
    });

    it('should handle empty reference data gracefully', async () => {
      const modelId = 'test-model-3';
      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [
          createFeatureDistribution('feature_1', 50, 10, 0, 100),
        ],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.dataDrift).toBeDefined();
      expect(result.dataDrift.score).toBe(0);
      expect(result.dataDrift.featureDrift.length).toBe(0);
    });

    it('should calculate PSI correctly for distribution shifts', async () => {
      const modelId = 'test-model-4';
      const data: CognitiveInputData = {
        modelId,
        referenceData: [
          createFeatureDistributionWithHistogram('feature_1', [100, 200, 300, 200, 100]),
        ],
        currentData: [
          // Different histogram distribution
          createFeatureDistributionWithHistogram('feature_1', [50, 100, 400, 300, 150]),
        ],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.dataDrift.featureDrift[0]).toBeDefined();
      expect(result.dataDrift.featureDrift[0].driftScore).toBeGreaterThan(0);
    });
  });

  describe('Concept Drift Detection', () => {
    it('should detect concept drift when prediction confidence changes', async () => {
      const modelId = 'test-model-5';

      // Create predictions with a clear change point
      const predictions = [];
      for (let i = 0; i < 50; i++) {
        predictions.push({
          timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
          confidence: 0.9 + Math.random() * 0.05, // High confidence initially
          prediction: 'class_a',
        });
      }
      for (let i = 50; i < 100; i++) {
        predictions.push({
          timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
          confidence: 0.5 + Math.random() * 0.1, // Lower confidence after
          prediction: 'class_a',
        });
      }

      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [],
        predictions,
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.conceptDrift).toBeDefined();
      expect(result.conceptDrift.changePoints.length).toBeGreaterThan(0);
    });

    it('should report no concept drift for stable predictions', async () => {
      const modelId = 'test-model-6';

      const predictions = [];
      for (let i = 0; i < 100; i++) {
        predictions.push({
          timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
          confidence: 0.85 + Math.random() * 0.05, // Stable confidence
          prediction: 'class_a',
        });
      }

      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [],
        predictions,
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.conceptDrift.changePoints.length).toBe(0);
      expect(result.conceptDrift.detected).toBe(false);
    });

    it('should handle performance history correlation', async () => {
      const modelId = 'test-model-7';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [],
        predictions: [],
        groundTruth: [],
        performanceHistory: [
          { timestamp: '2024-01-01', accuracy: 0.95, latency: 100 },
          { timestamp: '2024-01-02', accuracy: 0.92, latency: 110 },
          { timestamp: '2024-01-03', accuracy: 0.88, latency: 120 },
          { timestamp: '2024-01-04', accuracy: 0.80, latency: 150 },
        ],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.conceptDrift.performanceCorrelation).toBeGreaterThan(0);
    });
  });

  describe('Prediction Drift Detection', () => {
    it('should detect prediction drift when confidence distribution shifts', async () => {
      const modelId = 'test-model-8';

      const predictions = [];
      // First half: high confidence
      for (let i = 0; i < 50; i++) {
        predictions.push({
          timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
          confidence: 0.9,
          prediction: 'class_a',
        });
      }
      // Second half: low confidence
      for (let i = 50; i < 100; i++) {
        predictions.push({
          timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
          confidence: 0.4,
          prediction: 'class_b',
        });
      }

      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [],
        predictions,
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.predictionDrift).toBeDefined();
      expect(result.predictionDrift.confidenceDrift).toBeGreaterThan(0.3);
      expect(result.predictionDrift.detected).toBe(true);
    });

    it('should return empty metrics for no predictions', async () => {
      const modelId = 'test-model-9';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.predictionDrift.score).toBe(0);
      expect(result.predictionDrift.detected).toBe(false);
    });
  });

  describe('Overall Drift Score', () => {
    it('should compute weighted overall score correctly', async () => {
      const modelId = 'test-model-10';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [
          createFeatureDistribution('feature_1', 50, 10, 0, 100),
        ],
        currentData: [
          createFeatureDistribution('feature_1', 80, 30, 10, 150),
        ],
        predictions: generatePredictionsWithShift(100, 0.9, 0.5),
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.overallDriftScore).toBeDefined();
      expect(result.overallDriftScore.value).toBeGreaterThanOrEqual(0);
      expect(result.overallDriftScore.value).toBeLessThanOrEqual(1);
      expect(['info', 'low', 'medium', 'high', 'critical']).toContain(result.overallDriftScore.severity);
    });

    it('should classify severity correctly', async () => {
      // Test low severity
      const lowDriftConfig: CognitiveEngineConfig = {
        ...defaultConfig,
        driftThreshold: 0.9, // High threshold = low detected drift
      };
      const lowDetector = new DriftDetector(lowDriftConfig);

      const stableData: CognitiveInputData = {
        modelId: 'stable-model',
        referenceData: [createFeatureDistribution('f1', 50, 10, 0, 100)],
        currentData: [createFeatureDistribution('f1', 50.5, 10.2, 0, 100)],
        predictions: generateStablePredictions(50),
        groundTruth: [],
      };

      const result = await lowDetector.analyze('stable-model', stableData);

      expect(['info', 'low']).toContain(result.overallDriftScore.severity);
    });
  });

  describe('Recommendations', () => {
    it('should generate appropriate recommendations for data drift', async () => {
      const modelId = 'test-model-11';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [
          createFeatureDistribution('important_feature', 50, 10, 0, 100),
        ],
        currentData: [
          createFeatureDistribution('important_feature', 150, 50, 50, 300),
        ],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      if (result.driftDetected) {
        expect(result.recommendedActions.length).toBeGreaterThan(0);
        expect(result.recommendedActions.some(a => a.type === 'investigate' || a.type === 'retrain')).toBe(true);
      }
    });

    it('should recommend monitoring when no drift detected', async () => {
      const modelId = 'test-model-12';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [createFeatureDistribution('f1', 50, 10, 0, 100)],
        currentData: [createFeatureDistribution('f1', 50, 10, 0, 100)],
        predictions: generateStablePredictions(20),
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      if (!result.driftDetected) {
        expect(result.recommendedActions.some(a => a.type === 'monitor')).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', async () => {
      const modelId = 'single-point';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [createFeatureDistribution('f1', 50, 0, 50, 50)],
        currentData: [createFeatureDistribution('f1', 60, 0, 60, 60)],
        predictions: [{
          timestamp: new Date().toISOString(),
          confidence: 0.8,
          prediction: 'class_a',
        }],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result).toBeDefined();
      expect(result.modelId).toBe(modelId);
    });

    it('should handle very large datasets', async () => {
      const modelId = 'large-dataset';

      const predictions = [];
      for (let i = 0; i < 10000; i++) {
        predictions.push({
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
          confidence: 0.7 + Math.random() * 0.2,
          prediction: Math.random() > 0.5 ? 'class_a' : 'class_b',
        });
      }

      const data: CognitiveInputData = {
        modelId,
        referenceData: [],
        currentData: [],
        predictions,
        groundTruth: [],
      };

      const startTime = Date.now();
      const result = await detector.analyze(modelId, data);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle NaN values gracefully', async () => {
      const modelId = 'nan-test';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [createFeatureDistribution('f1', NaN, 10, 0, 100)],
        currentData: [createFeatureDistribution('f1', 50, NaN, 0, 100)],
        predictions: [],
        groundTruth: [],
      };

      // Should not throw
      const result = await detector.analyze(modelId, data);
      expect(result).toBeDefined();
    });

    it('should handle mismatched feature names', async () => {
      const modelId = 'mismatched';

      const data: CognitiveInputData = {
        modelId,
        referenceData: [createFeatureDistribution('feature_a', 50, 10, 0, 100)],
        currentData: [createFeatureDistribution('feature_b', 80, 20, 0, 150)],
        predictions: [],
        groundTruth: [],
      };

      const result = await detector.analyze(modelId, data);

      expect(result.dataDrift.featureDrift.length).toBe(0); // No matching features
    });
  });
});

// Helper functions
function createFeatureDistribution(
  name: string,
  mean: number,
  stdDev: number,
  min: number,
  max: number
): FeatureDistribution {
  return {
    featureName: name,
    mean,
    stdDev,
    min,
    max,
    histogram: [],
  };
}

function createFeatureDistributionWithHistogram(
  name: string,
  bucketCounts: number[]
): FeatureDistribution {
  const total = bucketCounts.reduce((a, b) => a + b, 0);
  const mean = bucketCounts.reduce((sum, count, i) => sum + count * i, 0) / total;

  return {
    featureName: name,
    mean,
    stdDev: 1,
    min: 0,
    max: bucketCounts.length,
    histogram: bucketCounts.map((count, i) => ({ bucket: i, count })),
  };
}

function generatePredictionsWithShift(
  count: number,
  initialConfidence: number,
  finalConfidence: number
): CognitiveInputData['predictions'] {
  const predictions = [];
  const midpoint = Math.floor(count / 2);

  for (let i = 0; i < count; i++) {
    const confidence = i < midpoint ? initialConfidence : finalConfidence;
    predictions.push({
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      confidence: confidence + (Math.random() * 0.05 - 0.025),
      prediction: 'class_a',
    });
  }

  return predictions;
}

function generateStablePredictions(count: number): CognitiveInputData['predictions'] {
  const predictions = [];

  for (let i = 0; i < count; i++) {
    predictions.push({
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      confidence: 0.85 + Math.random() * 0.05,
      prediction: 'class_a',
    });
  }

  return predictions;
}
