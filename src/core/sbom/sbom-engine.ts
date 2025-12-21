/**
 * AI Software Bill of Materials (SBOM) Engine
 *
 * Generates, manages, and analyzes AI SBOMs for supply chain security
 * and compliance transparency.
 *
 * @module sbom-engine
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AISBOM,
  SBOMCreator,
  AISystemSubject,
  ModelComponent,
  DatasetComponent,
  SoftwareDependency,
  InfrastructureComponent,
  ExternalServiceComponent,
  AIVulnerability,
  SBOMCompliance,
  SBOMRiskAssessment,
  ComponentRelationship,
  SBOMAuditEntry,
  SBOMGenerationRequest,
  SBOMDiff,
  SBOMQuery,
  SBOMExportOptions,
  AIVulnerabilityType,
  CategoryRisk,
  RiskCategory,
  KeyRisk,
  RiskRecommendation,
  ComplianceFrameworkAssessment,
} from '../types';

// ============================================================================
// SBOM Engine Interface
// ============================================================================

export interface ISBOMEngine {
  /** Generate a new SBOM for an AI system */
  generateSBOM(request: SBOMGenerationRequest): Promise<AISBOM>;

  /** Get an existing SBOM by ID */
  getSBOM(sbomId: string): Promise<AISBOM | null>;

  /** Update an existing SBOM */
  updateSBOM(sbomId: string, updates: Partial<AISBOM>): Promise<AISBOM>;

  /** Compare two SBOMs */
  diffSBOMs(previousId: string, currentId: string): Promise<SBOMDiff>;

  /** Query SBOMs */
  querySBOMs(query: SBOMQuery): Promise<AISBOM[]>;

  /** Export SBOM in various formats */
  exportSBOM(sbomId: string, options: SBOMExportOptions): Promise<string>;

  /** Scan for vulnerabilities */
  scanVulnerabilities(sbomId: string): Promise<AIVulnerability[]>;

  /** Assess compliance */
  assessCompliance(sbomId: string, frameworks: string[]): Promise<SBOMCompliance>;

  /** Calculate risk assessment */
  calculateRisk(sbomId: string): Promise<SBOMRiskAssessment>;

  /** Add component to SBOM */
  addComponent(sbomId: string, component: ModelComponent | DatasetComponent | SoftwareDependency): Promise<void>;

  /** Remove component from SBOM */
  removeComponent(sbomId: string, componentId: string): Promise<void>;

  /** Get SBOM audit trail */
  getAuditTrail(sbomId: string): Promise<SBOMAuditEntry[]>;
}

// ============================================================================
// SBOM Engine Implementation
// ============================================================================

export class SBOMEngine implements ISBOMEngine {
  private sboms: Map<string, AISBOM> = new Map();
  private vulnerabilityDatabase: Map<string, AIVulnerability> = new Map();

  constructor(
    private readonly config: SBOMEngineConfig = {}
  ) {
    this.initializeVulnerabilityDatabase();
  }

  async generateSBOM(request: SBOMGenerationRequest): Promise<AISBOM> {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Discover components
    const models = await this.discoverModels(request.systemId);
    const datasets = await this.discoverDatasets(request.systemId);
    const dependencies = await this.discoverDependencies(request.systemId, request.includeTransitiveDeps);
    const infrastructure = await this.discoverInfrastructure(request.systemId);
    const externalServices = await this.discoverExternalServices(request.systemId);

    // Build relationships
    const relationships = this.buildRelationships(models, datasets, dependencies, infrastructure, externalServices);

    // Scan vulnerabilities if requested
    const vulnerabilities = request.scanVulnerabilities
      ? await this.scanComponents(models, dependencies, externalServices)
      : [];

    // Assess compliance if requested
    const compliance = request.assessCompliance.length > 0
      ? await this.assessFrameworks(request.assessCompliance, models, datasets)
      : this.createEmptyCompliance();

    // Calculate risk
    const riskAssessment = await this.calculateRiskAssessment(models, datasets, dependencies, vulnerabilities);

    const sbom: AISBOM = {
      id,
      specVersion: '1.0.0',
      generatedAt: now,
      documentHash: '', // Will be set after creation

      creator: this.getCreatorInfo(),
      subject: await this.getSystemSubject(request.systemId),

      models,
      datasets,
      dependencies,
      infrastructure,
      externalServices,

      vulnerabilities,
      compliance,
      riskAssessment,

      relationships,
      auditLog: [{
        id: uuidv4(),
        timestamp: now,
        action: 'created',
        actor: 'system',
        reason: `SBOM generated for system ${request.systemId}`,
      }],
    };

    // Calculate document hash
    sbom.documentHash = this.calculateHash(sbom);

    this.sboms.set(id, sbom);
    return sbom;
  }

  async getSBOM(sbomId: string): Promise<AISBOM | null> {
    return this.sboms.get(sbomId) || null;
  }

  async updateSBOM(sbomId: string, updates: Partial<AISBOM>): Promise<AISBOM> {
    const existing = this.sboms.get(sbomId);
    if (!existing) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    const previousHash = existing.documentHash;
    const updated: AISBOM = {
      ...existing,
      ...updates,
      auditLog: [
        ...existing.auditLog,
        {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'updated',
          actor: 'system',
          previousValue: { documentHash: previousHash },
          newValue: updates,
        },
      ],
    };

    updated.documentHash = this.calculateHash(updated);
    this.sboms.set(sbomId, updated);
    return updated;
  }

  async diffSBOMs(previousId: string, currentId: string): Promise<SBOMDiff> {
    const previous = await this.getSBOM(previousId);
    const current = await this.getSBOM(currentId);

    if (!previous || !current) {
      throw new Error('One or both SBOMs not found');
    }

    const previousComponentIds = new Set([
      ...previous.models.map(m => m.id),
      ...previous.datasets.map(d => d.id),
      ...previous.dependencies.map(d => d.id),
    ]);

    const currentComponentIds = new Set([
      ...current.models.map(m => m.id),
      ...current.datasets.map(d => d.id),
      ...current.dependencies.map(d => d.id),
    ]);

    const addedComponents = [...currentComponentIds].filter(id => !previousComponentIds.has(id));
    const removedComponents = [...previousComponentIds].filter(id => !currentComponentIds.has(id));

    // Find modified components
    const modifiedComponents = this.findModifiedComponents(previous, current);

    // Find vulnerability changes
    const previousVulnIds = new Set(previous.vulnerabilities.map(v => v.id));
    const currentVulnIds = new Set(current.vulnerabilities.map(v => v.id));

    const newVulnerabilities = current.vulnerabilities.filter(v => !previousVulnIds.has(v.id));
    const resolvedVulnerabilities = [...previousVulnIds].filter(id => !currentVulnIds.has(id));

    // Find compliance changes
    const complianceChanges = this.findComplianceChanges(previous.compliance, current.compliance);

    // Calculate risk score change
    const riskScoreChange = current.riskAssessment.overallRisk.value - previous.riskAssessment.overallRisk.value;

    return {
      previousSbomId: previousId,
      currentSbomId: currentId,
      generatedAt: new Date().toISOString(),
      addedComponents,
      removedComponents,
      modifiedComponents,
      newVulnerabilities,
      resolvedVulnerabilities,
      complianceChanges,
      riskScoreChange,
    };
  }

  async querySBOMs(query: SBOMQuery): Promise<AISBOM[]> {
    let results = Array.from(this.sboms.values());

    if (query.complianceStatus) {
      results = results.filter(s => s.compliance.overallStatus === query.complianceStatus);
    }

    if (query.minVulnerabilitySeverity) {
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      const minIndex = severityOrder.indexOf(query.minVulnerabilitySeverity);
      results = results.filter(s =>
        s.vulnerabilities.some(v => severityOrder.indexOf(v.severity.severity) <= minIndex)
      );
    }

    if (query.providers?.length) {
      results = results.filter(s =>
        s.models.some(m => query.providers!.includes(m.provider.name))
      );
    }

    return results;
  }

  async exportSBOM(sbomId: string, options: SBOMExportOptions): Promise<string> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    // Create export object based on options
    const exportData = this.prepareExportData(sbom, options);

    switch (options.format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);

      case 'spdx-json':
        return this.toSPDXJson(exportData);

      case 'cyclonedx-json':
        return this.toCycloneDXJson(exportData);

      case 'spdx-tag':
        return this.toSPDXTagValue(exportData);

      case 'cyclonedx-xml':
        return this.toCycloneDXXml(exportData);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  async scanVulnerabilities(sbomId: string): Promise<AIVulnerability[]> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    return this.scanComponents(sbom.models, sbom.dependencies, sbom.externalServices);
  }

  async assessCompliance(sbomId: string, frameworks: string[]): Promise<SBOMCompliance> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    return this.assessFrameworks(
      frameworks as ComplianceFrameworkAssessment['framework'][],
      sbom.models,
      sbom.datasets
    );
  }

  async calculateRisk(sbomId: string): Promise<SBOMRiskAssessment> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    return this.calculateRiskAssessment(
      sbom.models,
      sbom.datasets,
      sbom.dependencies,
      sbom.vulnerabilities
    );
  }

  async addComponent(
    sbomId: string,
    component: ModelComponent | DatasetComponent | SoftwareDependency
  ): Promise<void> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    // Determine component type and add to appropriate array
    if ('architecture' in component) {
      sbom.models.push(component as ModelComponent);
    } else if ('quality' in component && 'privacy' in component) {
      sbom.datasets.push(component as DatasetComponent);
    } else {
      sbom.dependencies.push(component as SoftwareDependency);
    }

    // Add audit entry
    sbom.auditLog.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action: 'component-added',
      actor: 'system',
      componentId: component.id,
      newValue: component as any,
    });

    // Update hash
    sbom.documentHash = this.calculateHash(sbom);
    this.sboms.set(sbomId, sbom);
  }

  async removeComponent(sbomId: string, componentId: string): Promise<void> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }

    // Remove from all component arrays
    sbom.models = sbom.models.filter(m => m.id !== componentId);
    sbom.datasets = sbom.datasets.filter(d => d.id !== componentId);
    sbom.dependencies = sbom.dependencies.filter(d => d.id !== componentId);
    sbom.infrastructure = sbom.infrastructure.filter(i => i.id !== componentId);
    sbom.externalServices = sbom.externalServices.filter(e => e.id !== componentId);

    // Add audit entry
    sbom.auditLog.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action: 'component-removed',
      actor: 'system',
      componentId,
    });

    // Update hash
    sbom.documentHash = this.calculateHash(sbom);
    this.sboms.set(sbomId, sbom);
  }

  async getAuditTrail(sbomId: string): Promise<SBOMAuditEntry[]> {
    const sbom = await this.getSBOM(sbomId);
    if (!sbom) {
      throw new Error(`SBOM not found: ${sbomId}`);
    }
    return sbom.auditLog;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeVulnerabilityDatabase(): void {
    // Initialize with known AI vulnerabilities
    const knownVulns: Partial<AIVulnerability>[] = [
      {
        id: 'AIOBS-2024-001',
        type: 'prompt-injection',
        title: 'Prompt Injection via System Message Override',
        description: 'Attackers can override system instructions through crafted user inputs',
        severity: { value: 0.9, severity: 'critical', confidence: 0.95 },
      },
      {
        id: 'AIOBS-2024-002',
        type: 'data-leak',
        title: 'Training Data Extraction',
        description: 'Model may leak training data through targeted prompting',
        severity: { value: 0.8, severity: 'high', confidence: 0.85 },
      },
      {
        id: 'AIOBS-2024-003',
        type: 'jailbreak',
        title: 'DAN-style Jailbreak Vulnerability',
        description: 'Model susceptible to roleplay-based guardrail bypasses',
        severity: { value: 0.7, severity: 'high', confidence: 0.9 },
      },
    ];

    knownVulns.forEach(v => {
      this.vulnerabilityDatabase.set(v.id!, v as AIVulnerability);
    });
  }

  private async discoverModels(systemId: string): Promise<ModelComponent[]> {
    // In production, this would scan the actual system
    // For now, return placeholder
    return [];
  }

  private async discoverDatasets(systemId: string): Promise<DatasetComponent[]> {
    return [];
  }

  private async discoverDependencies(systemId: string, includeTransitive: boolean): Promise<SoftwareDependency[]> {
    return [];
  }

  private async discoverInfrastructure(systemId: string): Promise<InfrastructureComponent[]> {
    return [];
  }

  private async discoverExternalServices(systemId: string): Promise<ExternalServiceComponent[]> {
    return [];
  }

  private buildRelationships(
    models: ModelComponent[],
    datasets: DatasetComponent[],
    dependencies: SoftwareDependency[],
    infrastructure: InfrastructureComponent[],
    externalServices: ExternalServiceComponent[]
  ): ComponentRelationship[] {
    const relationships: ComponentRelationship[] = [];

    // Build model-dataset relationships
    models.forEach(model => {
      if (model.training?.datasetIds) {
        model.training.datasetIds.forEach(datasetId => {
          relationships.push({
            sourceId: model.id,
            targetId: datasetId,
            type: 'trained-on',
          });
        });
      }
    });

    // Build dependency relationships
    dependencies.forEach(dep => {
      dep.dependsOn.forEach(depId => {
        relationships.push({
          sourceId: dep.id,
          targetId: depId,
          type: 'depends-on',
        });
      });
    });

    return relationships;
  }

  private async scanComponents(
    models: ModelComponent[],
    dependencies: SoftwareDependency[],
    externalServices: ExternalServiceComponent[]
  ): Promise<AIVulnerability[]> {
    const vulnerabilities: AIVulnerability[] = [];
    const now = new Date().toISOString();

    // Check models for known vulnerabilities
    models.forEach(model => {
      // Check for prompt injection vulnerability in LLMs
      if (model.architecture.family === 'transformer' && model.type === 'foundation') {
        vulnerabilities.push({
          id: `AIOBS-SCAN-${uuidv4().slice(0, 8)}`,
          type: 'prompt-injection',
          severity: { value: 0.8, severity: 'high', confidence: 0.9 },
          affectedComponents: [model.id],
          title: 'Potential Prompt Injection Vulnerability',
          description: `Foundation model ${model.name} may be susceptible to prompt injection attacks`,
          discoveredAt: now,
          discoveredBy: 'AIOBS Scanner',
          status: 'open',
          references: ['https://owasp.org/www-project-top-10-for-large-language-model-applications/'],
        });
      }

      // Check for data provenance issues
      if (!model.dataProvenance.piiVerified) {
        vulnerabilities.push({
          id: `AIOBS-SCAN-${uuidv4().slice(0, 8)}`,
          type: 'data-leak',
          severity: { value: 0.6, severity: 'medium', confidence: 0.7 },
          affectedComponents: [model.id],
          title: 'Unverified PII in Training Data',
          description: `Model ${model.name} has not been verified for PII in training data`,
          discoveredAt: now,
          discoveredBy: 'AIOBS Scanner',
          status: 'open',
          references: [],
        });
      }
    });

    // Check dependencies for CVEs
    dependencies.forEach(dep => {
      dep.vulnerabilities.forEach(cve => {
        vulnerabilities.push({
          id: cve.cveId,
          type: 'traditional-cve',
          severity: {
            value: cve.severity === 'critical' ? 0.95 : cve.severity === 'high' ? 0.8 : 0.5,
            severity: cve.severity,
            confidence: 1.0,
          },
          affectedComponents: [dep.id],
          title: cve.cveId,
          description: cve.description,
          discoveredAt: cve.publishedAt,
          discoveredBy: 'CVE Database',
          status: cve.fixedIn ? 'mitigated' : 'open',
          remediation: cve.fixedIn ? {
            description: `Update to version ${cve.fixedIn}`,
          } : undefined,
          references: [`https://nvd.nist.gov/vuln/detail/${cve.cveId}`],
        });
      });
    });

    return vulnerabilities;
  }

  private async assessFrameworks(
    frameworks: ComplianceFrameworkAssessment['framework'][],
    models: ModelComponent[],
    datasets: DatasetComponent[]
  ): Promise<SBOMCompliance> {
    const now = new Date().toISOString();
    const frameworkAssessments: ComplianceFrameworkAssessment[] = [];

    for (const framework of frameworks) {
      const assessment = await this.assessSingleFramework(framework, models, datasets);
      frameworkAssessments.push(assessment);
    }

    // Determine overall status
    const statuses = frameworkAssessments.map(f => f.status);
    let overallStatus: SBOMCompliance['overallStatus'] = 'compliant';
    if (statuses.includes('non-compliant')) {
      overallStatus = 'non-compliant';
    } else if (statuses.includes('partial')) {
      overallStatus = 'partial';
    } else if (statuses.includes('not-assessed')) {
      overallStatus = 'pending';
    }

    return {
      frameworks: frameworkAssessments,
      overallStatus,
      lastAssessment: now,
    };
  }

  private async assessSingleFramework(
    framework: ComplianceFrameworkAssessment['framework'],
    models: ModelComponent[],
    datasets: DatasetComponent[]
  ): Promise<ComplianceFrameworkAssessment> {
    const now = new Date().toISOString();
    const gaps: ComplianceFrameworkAssessment['gaps'] = [];

    switch (framework) {
      case 'eu-ai-act':
        // Check high-risk requirements
        const hasHumanOversight = models.every(m =>
          m.security.guardrails.some(g => g.type === 'content-filter' && g.enabled)
        );
        if (!hasHumanOversight) {
          gaps.push({
            requirement: 'Article 14 - Human Oversight',
            description: 'Missing human oversight mechanisms for high-risk AI',
            severity: 'critical',
          });
        }

        const hasRiskAssessment = models.every(m => m.security.lastAudit);
        if (!hasRiskAssessment) {
          gaps.push({
            requirement: 'Article 9 - Risk Management',
            description: 'Risk assessment not documented for all models',
            severity: 'major',
          });
        }

        const hasDataGovernance = datasets.every(d => d.privacy.containsPII === false || d.privacy.anonymizationApplied);
        if (!hasDataGovernance) {
          gaps.push({
            requirement: 'Article 10 - Data Governance',
            description: 'PII handling not properly documented',
            severity: 'major',
          });
        }
        break;

      case 'gdpr':
        const hasPIIControls = datasets.every(d =>
          !d.privacy.containsPII || (d.privacy.anonymizationApplied && d.privacy.retentionPolicy)
        );
        if (!hasPIIControls) {
          gaps.push({
            requirement: 'Article 5 - Data Minimization',
            description: 'PII controls not properly implemented',
            severity: 'critical',
          });
        }
        break;

      default:
        // Generic assessment
        break;
    }

    const status: ComplianceFrameworkAssessment['status'] =
      gaps.length === 0 ? 'compliant' :
      gaps.some(g => g.severity === 'critical') ? 'non-compliant' : 'partial';

    return {
      framework,
      version: '1.0',
      status,
      gaps,
      lastAssessed: now,
      assessor: 'AIOBS Compliance Engine',
    };
  }

  private async calculateRiskAssessment(
    models: ModelComponent[],
    datasets: DatasetComponent[],
    dependencies: SoftwareDependency[],
    vulnerabilities: AIVulnerability[]
  ): Promise<SBOMRiskAssessment> {
    const now = new Date().toISOString();

    // Calculate category risks
    const categoryRisks: CategoryRisk[] = [
      this.calculateSecurityRisk(models, vulnerabilities),
      this.calculatePrivacyRisk(datasets),
      this.calculateSupplyChainRisk(dependencies),
      this.calculateOperationalRisk(models),
    ];

    // Calculate overall risk
    const overallRiskValue = categoryRisks.reduce((sum, cr) => sum + cr.score.value, 0) / categoryRisks.length;
    const overallSeverity = overallRiskValue > 0.8 ? 'critical' :
      overallRiskValue > 0.6 ? 'high' :
      overallRiskValue > 0.4 ? 'medium' : 'low';

    // Identify key risks
    const keyRisks: KeyRisk[] = [];
    if (vulnerabilities.some(v => v.severity.severity === 'critical')) {
      keyRisks.push({
        id: 'KR-001',
        title: 'Critical Vulnerabilities Present',
        description: 'One or more critical vulnerabilities detected in the AI system',
        category: 'security',
        likelihood: 'likely',
        impact: 'major',
        mitigations: ['Apply security patches', 'Implement additional guardrails'],
      });
    }

    // Generate recommendations
    const recommendations: RiskRecommendation[] = [];
    if (vulnerabilities.length > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Address Vulnerabilities',
        description: `${vulnerabilities.length} vulnerabilities require attention`,
        effort: 'medium',
        impact: 'high',
        affectedComponents: vulnerabilities.flatMap(v => v.affectedComponents),
      });
    }

    return {
      overallRisk: {
        value: overallRiskValue,
        severity: overallSeverity,
        confidence: 0.85,
      },
      categoryRisks,
      keyRisks,
      recommendations,
      assessedAt: now,
      assessedBy: 'AIOBS Risk Engine',
      methodology: 'AIOBS Risk Framework v1.0',
    };
  }

  private calculateSecurityRisk(models: ModelComponent[], vulnerabilities: AIVulnerability[]): CategoryRisk {
    const criticalVulns = vulnerabilities.filter(v => v.severity.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity.severity === 'high').length;

    const riskValue = Math.min(1, (criticalVulns * 0.3 + highVulns * 0.1));

    return {
      category: 'security',
      score: {
        value: riskValue,
        severity: riskValue > 0.7 ? 'critical' : riskValue > 0.4 ? 'high' : 'medium',
        confidence: 0.9,
      },
      factors: [
        `${criticalVulns} critical vulnerabilities`,
        `${highVulns} high vulnerabilities`,
      ],
    };
  }

  private calculatePrivacyRisk(datasets: DatasetComponent[]): CategoryRisk {
    const datasetsWithPII = datasets.filter(d => d.privacy.containsPII).length;
    const unprotectedPII = datasets.filter(d => d.privacy.containsPII && !d.privacy.anonymizationApplied).length;

    const riskValue = datasets.length > 0 ? unprotectedPII / datasets.length : 0;

    return {
      category: 'privacy',
      score: {
        value: riskValue,
        severity: riskValue > 0.5 ? 'high' : riskValue > 0.2 ? 'medium' : 'low',
        confidence: 0.85,
      },
      factors: [
        `${datasetsWithPII} datasets contain PII`,
        `${unprotectedPII} datasets with unprotected PII`,
      ],
    };
  }

  private calculateSupplyChainRisk(dependencies: SoftwareDependency[]): CategoryRisk {
    const depsWithVulns = dependencies.filter(d => d.vulnerabilities.length > 0).length;
    const unmaintainedDeps = dependencies.filter(d => !d.securityInfo.maintainerVerified).length;

    const riskValue = dependencies.length > 0
      ? (depsWithVulns * 0.5 + unmaintainedDeps * 0.3) / dependencies.length
      : 0;

    return {
      category: 'supply-chain',
      score: {
        value: Math.min(1, riskValue),
        severity: riskValue > 0.6 ? 'high' : riskValue > 0.3 ? 'medium' : 'low',
        confidence: 0.8,
      },
      factors: [
        `${depsWithVulns} dependencies with vulnerabilities`,
        `${unmaintainedDeps} unverified maintainers`,
      ],
    };
  }

  private calculateOperationalRisk(models: ModelComponent[]): CategoryRisk {
    const modelsWithoutGuardrails = models.filter(m =>
      m.security.guardrails.filter(g => g.enabled).length === 0
    ).length;

    const riskValue = models.length > 0 ? modelsWithoutGuardrails / models.length : 0;

    return {
      category: 'operational',
      score: {
        value: riskValue,
        severity: riskValue > 0.5 ? 'high' : riskValue > 0.2 ? 'medium' : 'low',
        confidence: 0.75,
      },
      factors: [
        `${modelsWithoutGuardrails} models without active guardrails`,
      ],
    };
  }

  private getCreatorInfo(): SBOMCreator {
    return {
      organization: this.config.organization || 'AIOBS',
      tool: 'AIOBS SBOM Engine',
      toolVersion: '1.0.0',
      contact: this.config.contact || 'security@aiobs.io',
    };
  }

  private async getSystemSubject(systemId: string): Promise<AISystemSubject> {
    // In production, would fetch from registry
    return {
      name: systemId,
      version: '1.0.0',
      description: 'AI System',
      primaryFunction: 'generation',
      riskLevel: 'limited',
      deployment: {
        environment: 'production',
        regions: ['us-east-1'],
        endpoints: [],
        lastDeployed: new Date().toISOString(),
      },
    };
  }

  private calculateHash(sbom: AISBOM): string {
    const hashInput = JSON.stringify({
      ...sbom,
      documentHash: undefined,
      auditLog: undefined,
    });
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private findModifiedComponents(previous: AISBOM, current: AISBOM): SBOMDiff['modifiedComponents'] {
    const modified: SBOMDiff['modifiedComponents'] = [];

    // Compare models
    previous.models.forEach(prevModel => {
      const currModel = current.models.find(m => m.id === prevModel.id);
      if (currModel && JSON.stringify(prevModel) !== JSON.stringify(currModel)) {
        modified.push({
          componentId: prevModel.id,
          changes: this.findFieldChanges(prevModel, currModel),
        });
      }
    });

    return modified;
  }

  private findFieldChanges(previous: any, current: any): SBOMDiff['modifiedComponents'][0]['changes'] {
    const changes: SBOMDiff['modifiedComponents'][0]['changes'] = [];

    Object.keys(current).forEach(key => {
      if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        changes.push({
          field: key,
          previousValue: previous[key],
          newValue: current[key],
        });
      }
    });

    return changes;
  }

  private findComplianceChanges(previous: SBOMCompliance, current: SBOMCompliance): SBOMDiff['complianceChanges'] {
    const changes: SBOMDiff['complianceChanges'] = [];

    previous.frameworks.forEach(prevFramework => {
      const currFramework = current.frameworks.find(f => f.framework === prevFramework.framework);
      if (currFramework && prevFramework.status !== currFramework.status) {
        changes.push({
          framework: prevFramework.framework,
          previousStatus: prevFramework.status,
          newStatus: currFramework.status,
          reason: 'Compliance status changed',
        });
      }
    });

    return changes;
  }

  private createEmptyCompliance(): SBOMCompliance {
    return {
      frameworks: [],
      overallStatus: 'pending',
      lastAssessment: new Date().toISOString(),
    };
  }

  private prepareExportData(sbom: AISBOM, options: SBOMExportOptions): Partial<AISBOM> {
    const data: Partial<AISBOM> = { ...sbom };

    if (!options.includeVulnerabilities) {
      delete data.vulnerabilities;
    }

    if (!options.includeCompliance) {
      delete data.compliance;
    }

    if (!options.includeRiskAssessment) {
      delete data.riskAssessment;
    }

    if (options.redactSensitive) {
      // Redact sensitive information
      data.models = data.models?.map(m => ({
        ...m,
        metadata: {},
      }));
    }

    return data;
  }

  private toSPDXJson(data: Partial<AISBOM>): string {
    // Convert to SPDX 2.3 format
    const spdx = {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: `SPDXRef-${data.id}`,
      name: data.subject?.name,
      documentNamespace: `https://aiobs.io/spdx/${data.id}`,
      creationInfo: {
        created: data.generatedAt,
        creators: [`Tool: ${data.creator?.tool}-${data.creator?.toolVersion}`],
      },
      packages: data.models?.map(m => ({
        SPDXID: `SPDXRef-${m.id}`,
        name: m.name,
        versionInfo: m.version,
        supplier: m.provider.name,
        downloadLocation: 'NOASSERTION',
      })),
    };
    return JSON.stringify(spdx, null, 2);
  }

  private toCycloneDXJson(data: Partial<AISBOM>): string {
    // Convert to CycloneDX 1.5 format
    const cdx = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${data.id}`,
      version: 1,
      metadata: {
        timestamp: data.generatedAt,
        tools: [{
          vendor: data.creator?.organization,
          name: data.creator?.tool,
          version: data.creator?.toolVersion,
        }],
      },
      components: data.models?.map(m => ({
        type: 'machine-learning-model',
        name: m.name,
        version: m.version,
        supplier: { name: m.provider.name },
      })),
    };
    return JSON.stringify(cdx, null, 2);
  }

  private toSPDXTagValue(data: Partial<AISBOM>): string {
    let output = '';
    output += `SPDXVersion: SPDX-2.3\n`;
    output += `DataLicense: CC0-1.0\n`;
    output += `SPDXID: SPDXRef-${data.id}\n`;
    output += `DocumentName: ${data.subject?.name}\n`;
    output += `DocumentNamespace: https://aiobs.io/spdx/${data.id}\n`;
    return output;
  }

  private toCycloneDXXml(data: Partial<AISBOM>): string {
    // Simplified XML output
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<bom xmlns="http://cyclonedx.org/schema/bom/1.5">\n';
    xml += `  <metadata><timestamp>${data.generatedAt}</timestamp></metadata>\n`;
    xml += '  <components>\n';
    data.models?.forEach(m => {
      xml += `    <component type="machine-learning-model">\n`;
      xml += `      <name>${m.name}</name>\n`;
      xml += `      <version>${m.version}</version>\n`;
      xml += `    </component>\n`;
    });
    xml += '  </components>\n';
    xml += '</bom>';
    return xml;
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SBOMEngineConfig {
  organization?: string;
  contact?: string;
  vulnerabilityDatabaseUrl?: string;
  autoScan?: boolean;
  scanInterval?: number;
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const sbomEngine = new SBOMEngine();
