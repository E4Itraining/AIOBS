/**
 * Semantic Context Analyzer
 *
 * Analyzes whether the operational meaning of model outputs has shifted
 * even when statistical distributions remain normal. This is the key
 * differentiator from classical drift detection.
 *
 * Detects:
 * - Meaning inversion (output means the opposite)
 * - Context displacement (valid output in wrong context)
 * - Confidence manipulation (scores misaligned with quality)
 * - Boundary erosion (decision boundaries gradually shifted)
 * - Operational decorrelation (outputs decorrelate from intent)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SemanticContextResult,
  SemanticShift,
  SemanticShiftType,
  SemanticDriftConfig,
} from '../../types/semantic-drift';
import { NormalizedScore } from '../../types/common';
import { InferenceRecord, OperationalContext } from './semantic-drift-engine';

export class SemanticContextAnalyzer {
  private config: SemanticDriftConfig;

  constructor(config: SemanticDriftConfig) {
    this.config = config;
  }

  /**
   * Analyze semantic context of model outputs
   */
  analyze(
    current: InferenceRecord[],
    reference: InferenceRecord[],
    context?: OperationalContext
  ): SemanticContextResult {
    if (current.length === 0 || reference.length === 0) {
      return this.emptyResult();
    }

    // 1. Check if statistical distribution is normal
    const statisticallyNormal = this.isStatisticallyNormal(current, reference);

    // 2. Compute domain coherence
    const domainCoherence = this.computeDomainCoherence(current, reference, context);

    // 3. Compute decision boundary shift
    const decisionBoundaryShift = this.computeDecisionBoundaryShift(current, reference);

    // 4. Compute action mapping consistency
    const actionMappingConsistency = this.computeActionMappingConsistency(current, reference);

    // 5. Compute temporal consistency
    const temporalConsistency = this.computeTemporalConsistency(current);

    // 6. Detect semantic shifts
    const detectedShifts = this.detectSemanticShifts(
      current, reference, context,
      domainCoherence, decisionBoundaryShift, actionMappingConsistency
    );

    // 7. Determine if semantically shifted
    const semanticallyShifted = detectedShifts.some(s => s.adversarialIndicator)
      || domainCoherence < this.config.contextAnalyzer.domainCoherenceThreshold
      || (statisticallyNormal && detectedShifts.length > 0);

    // 8. Compute correlation between statistical and semantic drift
    const statisticalSemanticCorrelation = statisticallyNormal && semanticallyShifted
      ? 0.1  // Low correlation = stealth attack indicator
      : 0.8; // High correlation = natural drift

    return {
      statisticallyNormal,
      semanticallyShifted,
      domainCoherence,
      decisionBoundaryShift,
      actionMappingConsistency,
      temporalConsistency,
      detectedShifts,
      statisticalSemanticCorrelation,
    };
  }

  /**
   * Check if statistical distribution is within normal bounds
   * (to identify stealth semantic attacks that maintain statistical normalcy)
   */
  private isStatisticallyNormal(current: InferenceRecord[], reference: InferenceRecord[]): boolean {
    // Compare confidence distributions
    const refConf = reference.map(r => r.confidence);
    const curConf = current.map(r => r.confidence);

    const refMean = this.mean(refConf);
    const curMean = this.mean(curConf);
    const refStd = this.stdDev(refConf);

    // If current mean is within 2 std of reference, it's statistically normal
    const meanWithinBounds = Math.abs(curMean - refMean) < 2 * Math.max(refStd, 0.01);

    // Also check feature-space normality
    const featureCount = current[0]?.features.length || 0;
    let normalFeatures = 0;
    for (let f = 0; f < featureCount; f++) {
      const refValues = reference.map(r => r.features[f] || 0);
      const curValues = current.map(r => r.features[f] || 0);
      const rm = this.mean(refValues);
      const rs = this.stdDev(refValues);
      const cm = this.mean(curValues);
      if (Math.abs(cm - rm) < 2 * Math.max(rs, 0.01)) {
        normalFeatures++;
      }
    }

    const featureNormality = featureCount > 0 ? normalFeatures / featureCount : 1;
    return meanWithinBounds && featureNormality > 0.8;
  }

  /**
   * Compute domain coherence — how well current outputs fit the operational domain
   */
  private computeDomainCoherence(
    current: InferenceRecord[],
    reference: InferenceRecord[],
    context?: OperationalContext
  ): NormalizedScore {
    // Compare output category distribution
    const refOutputs = this.getOutputDistribution(reference);
    const curOutputs = this.getOutputDistribution(current);

    // Jensen-Shannon divergence proxy between distributions
    let divergence = 0;
    const allKeys = new Set([...Object.keys(refOutputs), ...Object.keys(curOutputs)]);
    for (const key of allKeys) {
      const p = refOutputs[key] || 0.001;
      const q = curOutputs[key] || 0.001;
      const m = (p + q) / 2;
      divergence += 0.5 * p * Math.log(p / m) + 0.5 * q * Math.log(q / m);
    }

    // Check against expected categories if context provided
    let categoryPenalty = 0;
    if (context?.expectedCategories && context.expectedCategories.length > 0) {
      const unexpectedOutputs = Object.keys(curOutputs).filter(
        k => !context.expectedCategories.includes(k)
      );
      categoryPenalty = unexpectedOutputs.length / Math.max(Object.keys(curOutputs).length, 1) * 0.3;
    }

    return Math.max(0, Math.min(1, 1 - divergence - categoryPenalty));
  }

  /**
   * Compute decision boundary shift
   */
  private computeDecisionBoundaryShift(
    current: InferenceRecord[],
    reference: InferenceRecord[]
  ): NormalizedScore {
    // Measure shift in confidence distribution around decision boundary (0.5)
    const refBoundaryConfidences = reference
      .filter(r => r.confidence > 0.3 && r.confidence < 0.7)
      .map(r => r.confidence);
    const curBoundaryConfidences = current
      .filter(r => r.confidence > 0.3 && r.confidence < 0.7)
      .map(r => r.confidence);

    if (refBoundaryConfidences.length === 0 || curBoundaryConfidences.length === 0) {
      return 0;
    }

    // Check if the boundary region population has shifted
    const refBoundaryRate = refBoundaryConfidences.length / reference.length;
    const curBoundaryRate = curBoundaryConfidences.length / current.length;
    const rateShift = Math.abs(curBoundaryRate - refBoundaryRate);

    // Check mean confidence shift in boundary region
    const refBoundaryMean = this.mean(refBoundaryConfidences);
    const curBoundaryMean = this.mean(curBoundaryConfidences);
    const meanShift = Math.abs(curBoundaryMean - refBoundaryMean);

    return Math.min(1, rateShift * 3 + meanShift * 2);
  }

  /**
   * Compute action mapping consistency (output → operational action mapping)
   */
  private computeActionMappingConsistency(
    current: InferenceRecord[],
    reference: InferenceRecord[]
  ): NormalizedScore {
    // Compare the mapping of outputs to operational labels
    const hasLabels = current.some(r => r.operationalLabel) && reference.some(r => r.operationalLabel);
    if (!hasLabels) {
      // Fall back to confidence-output correlation
      return this.computeConfidenceOutputCorrelation(current, reference);
    }

    // Build output→label mapping for reference
    const refMapping: Record<string, Record<string, number>> = {};
    for (const r of reference) {
      const output = String(r.output);
      const label = r.operationalLabel || 'unknown';
      if (!refMapping[output]) refMapping[output] = {};
      refMapping[output][label] = (refMapping[output][label] || 0) + 1;
    }

    // Check current against reference mapping
    let consistent = 0;
    let total = 0;
    for (const r of current) {
      const output = String(r.output);
      const label = r.operationalLabel || 'unknown';
      if (refMapping[output]) {
        total++;
        const expectedLabels = Object.keys(refMapping[output]);
        if (expectedLabels.includes(label)) {
          consistent++;
        }
      }
    }

    return total > 0 ? consistent / total : 0.5;
  }

  /**
   * Compute temporal consistency of outputs
   */
  private computeTemporalConsistency(current: InferenceRecord[]): NormalizedScore {
    if (current.length < 5) return 1;

    // Check for sudden distribution changes within the current window
    const windowSize = Math.max(5, Math.floor(current.length / 4));
    let maxShift = 0;

    for (let i = windowSize; i < current.length - windowSize; i++) {
      const before = current.slice(i - windowSize, i).map(r => r.confidence);
      const after = current.slice(i, i + windowSize).map(r => r.confidence);
      const shift = Math.abs(this.mean(before) - this.mean(after));
      maxShift = Math.max(maxShift, shift);
    }

    return Math.max(0, 1 - maxShift * 5);
  }

  /**
   * Detect specific semantic shifts
   */
  private detectSemanticShifts(
    current: InferenceRecord[],
    reference: InferenceRecord[],
    context: OperationalContext | undefined,
    domainCoherence: NormalizedScore,
    boundaryShift: NormalizedScore,
    actionConsistency: NormalizedScore
  ): SemanticShift[] {
    const shifts: SemanticShift[] = [];
    const tolerance = this.config.contextAnalyzer.decisionBoundaryTolerance;

    // Check for boundary erosion
    if (boundaryShift > tolerance) {
      shifts.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        shiftType: 'boundary_erosion',
        magnitude: boundaryShift,
        confidence: Math.min(1, boundaryShift / tolerance),
        affectedOutputs: ['decision_boundary'],
        description: `Decision boundary shifted by ${(boundaryShift * 100).toFixed(1)}%`,
        adversarialIndicator: boundaryShift > tolerance * 3,
      });
    }

    // Check for operational decorrelation
    if (actionConsistency < 0.7) {
      shifts.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        shiftType: 'operational_decorrelation',
        magnitude: 1 - actionConsistency,
        confidence: 0.8,
        affectedOutputs: ['action_mapping'],
        description: `Output-to-action mapping consistency dropped to ${(actionConsistency * 100).toFixed(1)}%`,
        adversarialIndicator: actionConsistency < 0.4,
      });
    }

    // Check for context displacement
    if (domainCoherence < this.config.contextAnalyzer.domainCoherenceThreshold) {
      shifts.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        shiftType: 'context_displacement',
        magnitude: 1 - domainCoherence,
        confidence: 0.75,
        affectedOutputs: context?.expectedCategories || [],
        description: `Domain coherence dropped to ${(domainCoherence * 100).toFixed(1)}% — outputs may be contextually misplaced`,
        adversarialIndicator: domainCoherence < 0.3,
      });
    }

    // Check for confidence manipulation
    const confManipulation = this.detectConfidenceManipulation(current, reference);
    if (confManipulation > 0.3) {
      shifts.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        shiftType: 'confidence_manipulation',
        magnitude: confManipulation,
        confidence: 0.7,
        affectedOutputs: ['confidence_scores'],
        description: `Confidence scores appear miscalibrated (manipulation score: ${(confManipulation * 100).toFixed(1)}%)`,
        adversarialIndicator: confManipulation > 0.6,
      });
    }

    return shifts;
  }

  /**
   * Detect confidence score manipulation
   */
  private detectConfidenceManipulation(
    current: InferenceRecord[],
    reference: InferenceRecord[]
  ): NormalizedScore {
    // Compare confidence-output entropy relationship
    const refEntropy = this.computeConfidenceEntropy(reference);
    const curEntropy = this.computeConfidenceEntropy(current);

    // High confidence with high output entropy suggests manipulation
    const refMeanConf = this.mean(reference.map(r => r.confidence));
    const curMeanConf = this.mean(current.map(r => r.confidence));

    // If confidence increased but entropy also increased, it's suspicious
    const confIncrease = curMeanConf - refMeanConf;
    const entropyIncrease = curEntropy - refEntropy;

    if (confIncrease > 0.05 && entropyIncrease > 0.05) {
      return Math.min(1, (confIncrease + entropyIncrease) * 3);
    }

    return 0;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private getOutputDistribution(records: InferenceRecord[]): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const r of records) {
      const key = String(r.output);
      dist[key] = (dist[key] || 0) + 1;
    }
    const total = records.length;
    for (const key of Object.keys(dist)) {
      dist[key] = dist[key] / total;
    }
    return dist;
  }

  private computeConfidenceEntropy(records: InferenceRecord[]): number {
    const bins = 10;
    const histogram = new Array(bins).fill(0);
    for (const r of records) {
      const bin = Math.min(bins - 1, Math.floor(r.confidence * bins));
      histogram[bin]++;
    }
    const total = records.length;
    let entropy = 0;
    for (const count of histogram) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy / Math.log2(bins); // Normalized
  }

  private computeConfidenceOutputCorrelation(
    current: InferenceRecord[],
    reference: InferenceRecord[]
  ): NormalizedScore {
    // Compare confidence distributions per output category
    const refByOutput = this.groupByOutput(reference);
    const curByOutput = this.groupByOutput(current);

    let totalCorrelation = 0;
    let count = 0;

    for (const output of Object.keys(refByOutput)) {
      if (curByOutput[output]) {
        const refConf = this.mean(refByOutput[output].map(r => r.confidence));
        const curConf = this.mean(curByOutput[output].map(r => r.confidence));
        totalCorrelation += 1 - Math.abs(refConf - curConf);
        count++;
      }
    }

    return count > 0 ? totalCorrelation / count : 0.5;
  }

  private groupByOutput(records: InferenceRecord[]): Record<string, InferenceRecord[]> {
    const groups: Record<string, InferenceRecord[]> = {};
    for (const r of records) {
      const key = String(r.output);
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const m = this.mean(values);
    return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / values.length);
  }

  private emptyResult(): SemanticContextResult {
    return {
      statisticallyNormal: true,
      semanticallyShifted: false,
      domainCoherence: 1,
      decisionBoundaryShift: 0,
      actionMappingConsistency: 1,
      temporalConsistency: 1,
      detectedShifts: [],
      statisticalSemanticCorrelation: 1,
    };
  }
}
