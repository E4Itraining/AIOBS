/**
 * AI Supply Chain Security Engine
 *
 * Comprehensive supply chain security for AI models including:
 * - AI Bill of Materials (AI-BOM) generation
 * - Model provenance tracking
 * - Vulnerability scanning
 * - Dependency analysis
 * - Compliance verification
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AIBillOfMaterials,
  ModelIdentity,
  SBOMComponent,
  ModelProvenance,
  SecurityAssessment,
  ModelVulnerability,
  SupplyChainRisk,
  ComplianceStatus,
  SupplyChainAnalytics,
  DatasetLineage,
  TrainingRun,
  Attestation,
} from '../types/supply-chain';
import { NormalizedScore } from '../types/common';

/**
 * AI Supply Chain Security Engine
 */
export class SupplyChainEngine {
  private sboms: Map<string, AIBillOfMaterials> = new Map();
  private vulnerabilities: Map<string, ModelVulnerability[]> = new Map();
  private attestations: Map<string, Attestation[]> = new Map();

  constructor() {
    this.initializeDemoData();
  }

  /**
   * Generate AI Bill of Materials for a model
   */
  generateSBOM(modelId: string, modelInfo: Partial<ModelIdentity>): AIBillOfMaterials {
    const sbom: AIBillOfMaterials = {
      id: uuidv4(),
      version: '1.0.0',
      format: 'aiobs-sbom-1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generator: {
        name: 'AIOBS Supply Chain Engine',
        version: '1.0.0',
        vendor: 'GASKIA',
      },
      model: {
        id: modelId,
        name: modelInfo.name || 'Unknown Model',
        version: modelInfo.version || '1.0.0',
        type: modelInfo.type || 'llm',
        framework: modelInfo.framework || 'PyTorch',
        frameworkVersion: modelInfo.frameworkVersion || '2.0.0',
        architecture: modelInfo.architecture || 'transformer',
        size: modelInfo.size || { parameters: 7000000000, fileSize: 14, unit: 'GB' },
        hash: {
          algorithm: 'sha256',
          value: this.generateHash(modelId),
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
        licenses: modelInfo.licenses || [{ id: 'Apache-2.0', name: 'Apache License 2.0', commercial: true }],
      },
      components: this.generateComponents(modelId),
      dependencies: this.generateDependencies(modelId),
      provenance: this.generateProvenance(modelId),
      security: this.generateSecurityAssessment(modelId),
      compliance: this.generateComplianceStatus(modelId),
      signatures: [],
    };

    this.sboms.set(modelId, sbom);
    return sbom;
  }

  /**
   * Get SBOM for a model
   */
  getSBOM(modelId: string): AIBillOfMaterials | undefined {
    return this.sboms.get(modelId);
  }

  /**
   * Get all SBOMs
   */
  getAllSBOMs(): AIBillOfMaterials[] {
    return Array.from(this.sboms.values());
  }

  /**
   * Scan model for vulnerabilities
   */
  scanVulnerabilities(modelId: string): ModelVulnerability[] {
    const vulnerabilities: ModelVulnerability[] = [];
    const sbom = this.sboms.get(modelId);

    if (!sbom) return vulnerabilities;

    // Check components for known vulnerabilities
    for (const component of sbom.components) {
      // Simulated vulnerability detection
      if (component.type === 'library' && component.version) {
        const vulns = this.checkComponentVulnerabilities(component);
        vulnerabilities.push(...vulns);
      }

      if (component.type === 'dataset') {
        const dataVulns = this.checkDatasetVulnerabilities(component);
        vulnerabilities.push(...dataVulns);
      }
    }

    // Check for model-specific vulnerabilities
    const modelVulns = this.checkModelVulnerabilities(sbom.model);
    vulnerabilities.push(...modelVulns);

    this.vulnerabilities.set(modelId, vulnerabilities);
    return vulnerabilities;
  }

  /**
   * Get vulnerabilities for a model
   */
  getVulnerabilities(modelId: string): ModelVulnerability[] {
    return this.vulnerabilities.get(modelId) || [];
  }

  /**
   * Verify model provenance
   */
  verifyProvenance(modelId: string): { verified: boolean; issues: string[]; confidence: NormalizedScore } {
    const sbom = this.sboms.get(modelId);
    const issues: string[] = [];
    let confidence = 1.0;

    if (!sbom) {
      return { verified: false, issues: ['No SBOM found'], confidence: 0 };
    }

    // Check hash verification
    if (!sbom.model.hash.verified) {
      issues.push('Model hash not verified');
      confidence -= 0.3;
    }

    // Check provenance completeness
    const provenance = sbom.provenance;
    if (!provenance.origin.creator.verified) {
      issues.push('Creator not verified');
      confidence -= 0.2;
    }

    if (provenance.trainingRuns.length === 0) {
      issues.push('No training runs documented');
      confidence -= 0.2;
    }

    if (provenance.dataLineage.datasets.length === 0) {
      issues.push('No dataset lineage documented');
      confidence -= 0.15;
    }

    // Check attestations
    const attestations = this.attestations.get(modelId) || [];
    if (attestations.length === 0) {
      issues.push('No attestations found');
      confidence -= 0.15;
    }

    return {
      verified: issues.length === 0,
      issues,
      confidence: Math.max(0, confidence),
    };
  }

  /**
   * Add attestation to model
   */
  addAttestation(modelId: string, attestation: Omit<Attestation, 'id' | 'verified'>): Attestation {
    const fullAttestation: Attestation = {
      ...attestation,
      id: uuidv4(),
      verified: true,
    };

    const existing = this.attestations.get(modelId) || [];
    existing.push(fullAttestation);
    this.attestations.set(modelId, existing);

    return fullAttestation;
  }

  /**
   * Get supply chain analytics
   */
  getAnalytics(): SupplyChainAnalytics {
    const sboms = Array.from(this.sboms.values());
    const allVulnerabilities = Array.from(this.vulnerabilities.values()).flat();

    const criticalVulns = allVulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = allVulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = allVulnerabilities.filter(v => v.severity === 'medium').length;
    const lowVulns = allVulnerabilities.filter(v => v.severity === 'low').length;

    // Calculate overall risk score
    const totalVulns = allVulnerabilities.length;
    const riskScore = Math.min(1, (criticalVulns * 0.4 + highVulns * 0.3 + mediumVulns * 0.2 + lowVulns * 0.1) / Math.max(1, sboms.length));

    // Count components
    const allComponents = sboms.flatMap(s => s.components);
    const verifiedComponents = allComponents.filter(c => c.supplier?.verified).length;
    const outdatedComponents = allComponents.filter(c => this.isOutdated(c)).length;

    // Calculate compliance
    const compliantModels = sboms.filter(s => s.compliance.overallStatus === 'compliant').length;

    return {
      timestamp: new Date().toISOString(),
      overview: {
        totalModels: sboms.length,
        totalComponents: allComponents.length,
        uniqueSuppliers: new Set(allComponents.map(c => c.supplier?.name).filter(Boolean)).size,
        avgDependencyDepth: 3.2,
        modelsWithSBOM: sboms.length,
        sbomCoverage: sboms.length > 0 ? 1 : 0,
      },
      riskMetrics: {
        overallRiskScore: 1 - riskScore,
        criticalRisks: criticalVulns,
        highRisks: highVulns,
        mediumRisks: mediumVulns,
        lowRisks: lowVulns,
        riskTrend: { direction: 'decreasing', magnitude: 0.05, periodDays: 30, significance: 0.7 },
        topRisks: allVulnerabilities.slice(0, 5).map(v => ({
          id: v.id,
          component: v.affectedComponent,
          riskType: v.type as any,
          severity: v.severity,
          description: v.description,
          status: v.status === 'open' ? 'active' : 'mitigated',
        })),
      },
      componentHealth: {
        healthyComponents: verifiedComponents,
        atRiskComponents: allComponents.length - verifiedComponents - outdatedComponents,
        criticalComponents: criticalVulns,
        outdatedComponents,
        unverifiedComponents: allComponents.length - verifiedComponents,
      },
      vulnerabilityTrends: {
        newVulnerabilities: Math.floor(Math.random() * 5),
        resolvedVulnerabilities: Math.floor(Math.random() * 8),
        openVulnerabilities: totalVulns,
        avgTimeToRemediate: 72, // hours
        trend: { direction: 'decreasing', magnitude: 0.1, periodDays: 30, significance: 0.8 },
        byType: {
          'data-poisoning': allVulnerabilities.filter(v => v.type === 'data-poisoning').length,
          'model-extraction': allVulnerabilities.filter(v => v.type === 'model-extraction').length,
          'adversarial': allVulnerabilities.filter(v => v.type === 'adversarial').length,
          'dependency': allVulnerabilities.filter(v => v.type === 'dependency').length,
        },
      },
      complianceMetrics: {
        overallCompliance: sboms.length > 0 ? compliantModels / sboms.length : 0,
        compliantModels,
        partialModels: sboms.filter(s => s.compliance.overallStatus === 'partial').length,
        nonCompliantModels: sboms.filter(s => s.compliance.overallStatus === 'non-compliant').length,
        pendingAudits: Math.floor(Math.random() * 3),
        upcomingCertExpirations: Math.floor(Math.random() * 2),
      },
    };
  }

  // Private helper methods

  private generateHash(seed: string): string {
    // Simulated hash generation
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private generateComponents(modelId: string): SBOMComponent[] {
    return [
      {
        id: uuidv4(),
        type: 'model',
        name: 'Base Model',
        version: '1.0.0',
        supplier: { name: 'Model Provider', verified: true },
        licenses: [{ id: 'Apache-2.0', name: 'Apache License 2.0', commercial: true }],
        properties: [{ name: 'architecture', value: 'transformer' }],
        vulnerabilities: [],
      },
      {
        id: uuidv4(),
        type: 'dataset',
        name: 'Training Dataset',
        version: '2024.1',
        supplier: { name: 'Data Provider', verified: true },
        licenses: [{ id: 'CC-BY-4.0', name: 'Creative Commons Attribution 4.0', commercial: true }],
        properties: [{ name: 'samples', value: '1000000' }],
        vulnerabilities: [],
      },
      {
        id: uuidv4(),
        type: 'framework',
        name: 'PyTorch',
        version: '2.1.0',
        supplier: { name: 'Meta', verified: true },
        licenses: [{ id: 'BSD-3-Clause', name: 'BSD 3-Clause License', commercial: true }],
        properties: [],
        vulnerabilities: [],
      },
      {
        id: uuidv4(),
        type: 'library',
        name: 'transformers',
        version: '4.36.0',
        supplier: { name: 'Hugging Face', verified: true },
        licenses: [{ id: 'Apache-2.0', name: 'Apache License 2.0', commercial: true }],
        properties: [],
        vulnerabilities: [],
      },
      {
        id: uuidv4(),
        type: 'tokenizer',
        name: 'BPE Tokenizer',
        version: '1.0.0',
        licenses: [{ id: 'MIT', name: 'MIT License', commercial: true }],
        properties: [{ name: 'vocab_size', value: '50257' }],
        vulnerabilities: [],
      },
    ];
  }

  private generateDependencies(modelId: string): any[] {
    return [
      { id: uuidv4(), sourceId: modelId, targetId: uuidv4(), type: 'framework', version: '2.1.0', required: true, scope: 'inference' },
      { id: uuidv4(), sourceId: modelId, targetId: uuidv4(), type: 'library', version: '4.36.0', required: true, scope: 'inference' },
    ];
  }

  private generateProvenance(modelId: string): ModelProvenance {
    return {
      id: uuidv4(),
      modelId,
      createdAt: new Date().toISOString(),
      origin: {
        type: 'trained',
        creator: { id: 'creator-1', name: 'ML Team', verified: true },
        organization: { id: 'org-1', name: 'GASKIA', verified: true },
        repository: { type: 'git', url: 'https://github.com/org/model', commit: 'abc123' },
      },
      trainingRuns: [
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'initial',
          environment: {
            framework: 'PyTorch',
            frameworkVersion: '2.1.0',
            platform: 'Linux',
            hardware: [{ type: 'gpu', model: 'A100', count: 8, memory: '80GB' }],
            dependencies: ['transformers==4.36.0', 'datasets==2.16.0'],
          },
          hyperparameters: { learning_rate: 0.0001, batch_size: 32, epochs: 10 },
          datasets: [
            { id: uuidv4(), name: 'train-data', version: '1.0', hash: 'abc123', size: 50000000, samples: 1000000, source: 'internal' },
          ],
          metrics: { loss: 0.05, accuracy: 0.95, epochs: 10, steps: 100000 },
          duration: 86400000, // 24 hours in ms
          cost: 5000,
          carbon: 150,
        },
      ],
      dataLineage: {
        datasets: [
          {
            id: uuidv4(),
            name: 'Primary Training Dataset',
            version: '1.0',
            source: { type: 'proprietary', origin: 'Internal collection', license: 'Proprietary' },
            collection: { method: 'User-generated', languages: ['en', 'fr'], domains: ['general'] },
            processing: [{ step: 'Cleaning', timestamp: new Date().toISOString(), description: 'Removed duplicates', impact: 'Minor' }],
            quality: { completeness: 0.98, accuracy: 0.95, consistency: 0.92, freshness: 0.85, overallScore: 0.925 },
          },
        ],
        preprocessing: [{ id: '1', name: 'Tokenization', type: 'text', parameters: { max_length: 512 }, order: 1 }],
      },
      transformations: [],
      auditTrail: [
        { id: uuidv4(), timestamp: new Date().toISOString(), type: 'created', actor: 'ML Team', description: 'Model created' },
      ],
      attestations: [],
    };
  }

  private generateSecurityAssessment(modelId: string): SecurityAssessment {
    return {
      id: uuidv4(),
      modelId,
      timestamp: new Date().toISOString(),
      overallScore: 0.85,
      riskLevel: 'low',
      vulnerabilities: [],
      threats: [
        { id: uuidv4(), type: 'adversarial-attack', likelihood: 0.3, impact: 0.6, riskScore: 0.18, description: 'Potential adversarial inputs', mitigations: ['Input validation'], residualRisk: 0.05 },
      ],
      supplyChainRisks: [],
      recommendations: [
        { priority: 'medium', category: 'Security', title: 'Enable input validation', description: 'Add input validation layer', effort: 'low', impact: 'medium' },
      ],
    };
  }

  private generateComplianceStatus(modelId: string): ComplianceStatus {
    return {
      overallStatus: 'compliant',
      frameworks: [
        { framework: 'AI Act', version: '2024', status: 'compliant', score: 0.92, requirements: [], lastAssessed: new Date().toISOString() },
        { framework: 'ISO 27001', version: '2022', status: 'compliant', score: 0.88, requirements: [], lastAssessed: new Date().toISOString() },
      ],
      certifications: [],
      audits: [],
      gaps: [],
    };
  }

  private checkComponentVulnerabilities(component: SBOMComponent): ModelVulnerability[] {
    const vulnerabilities: ModelVulnerability[] = [];

    // Simulated vulnerability check - in production, use actual vulnerability databases
    if (component.name === 'transformers' && component.version && component.version < '4.35.0') {
      vulnerabilities.push({
        id: uuidv4(),
        type: 'dependency',
        severity: 'medium',
        description: 'Outdated transformers version with known security patches',
        affectedComponent: component.name,
        discoveredAt: new Date().toISOString(),
        status: 'open',
        remediation: 'Update to version 4.36.0 or later',
      });
    }

    return vulnerabilities;
  }

  private checkDatasetVulnerabilities(component: SBOMComponent): ModelVulnerability[] {
    const vulnerabilities: ModelVulnerability[] = [];

    // Check for potential data poisoning risks
    if (!component.supplier?.verified) {
      vulnerabilities.push({
        id: uuidv4(),
        type: 'data-poisoning',
        severity: 'high',
        description: 'Dataset from unverified supplier - potential data poisoning risk',
        affectedComponent: component.name,
        discoveredAt: new Date().toISOString(),
        status: 'open',
        remediation: 'Verify dataset supplier or scan for poisoned samples',
      });
    }

    return vulnerabilities;
  }

  private checkModelVulnerabilities(model: ModelIdentity): ModelVulnerability[] {
    const vulnerabilities: ModelVulnerability[] = [];

    // Check model-specific risks
    if (!model.hash.verified) {
      vulnerabilities.push({
        id: uuidv4(),
        type: 'configuration',
        severity: 'high',
        description: 'Model hash not verified - integrity cannot be confirmed',
        affectedComponent: model.name,
        discoveredAt: new Date().toISOString(),
        status: 'open',
        remediation: 'Verify model hash against known good value',
      });
    }

    return vulnerabilities;
  }

  private isOutdated(component: SBOMComponent): boolean {
    // Simplified outdated check - in production, compare against latest versions
    return false;
  }

  private initializeDemoData(): void {
    // Generate demo SBOMs
    const demoModels = [
      { id: 'fraud-detector-v1', name: 'Fraud Detector', type: 'classification' as const, framework: 'TensorFlow' },
      { id: 'churn-predictor-v1', name: 'Churn Predictor', type: 'classification' as const, framework: 'PyTorch' },
      { id: 'recommendation-v2', name: 'Recommendation Engine', type: 'embedding' as const, framework: 'PyTorch' },
      { id: 'sentiment-analyzer', name: 'Sentiment Analyzer', type: 'classification' as const, framework: 'Transformers' },
    ];

    for (const model of demoModels) {
      this.generateSBOM(model.id, model);
      this.scanVulnerabilities(model.id);
    }
  }
}

// Export singleton instance
export const supplyChainEngine = new SupplyChainEngine();
