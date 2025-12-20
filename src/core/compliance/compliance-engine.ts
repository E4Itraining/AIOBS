/**
 * Compliance Automation Engine
 *
 * Automated compliance checking, AI Act compliance,
 * regulatory tracking, and evidence generation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RegulatoryFramework,
  Requirement,
  AIActClassification,
  AIActRiskLevel,
  ComplianceAssessment,
  ComplianceFinding,
  AutomatedCheck,
  CheckResult,
  EvidencePackage,
  RegulatoryChange,
  ComplianceAnalytics,
  ComplianceWorkflow,
  WorkflowExecution,
} from '../types/compliance-automation';
import { NormalizedScore } from '../types/common';

/**
 * Compliance Automation Engine
 */
export class ComplianceEngine {
  private frameworks: Map<string, RegulatoryFramework> = new Map();
  private assessments: Map<string, ComplianceAssessment[]> = new Map();
  private classifications: Map<string, AIActClassification> = new Map();
  private checks: Map<string, AutomatedCheck> = new Map();
  private changes: RegulatoryChange[] = [];
  private workflows: Map<string, ComplianceWorkflow> = new Map();

  constructor() {
    this.initializeFrameworks();
    this.initializeDemoData();
  }

  /**
   * Classify AI system according to AI Act
   */
  classifyAIActRisk(systemId: string, systemInfo: {
    name: string;
    useCase: string;
    dataTypes: string[];
    outputType: string;
    autonomy: 'high' | 'medium' | 'low';
    humanOversight: boolean;
    affectedPopulation: 'general' | 'specific' | 'vulnerable';
  }): AIActClassification {
    const factors: AIActClassification['factors'] = [];
    let riskScore = 0;

    // Check for prohibited uses
    const prohibitedChecks = this.checkProhibitedUses(systemInfo);

    // Evaluate risk factors
    // 1. Autonomy level
    if (systemInfo.autonomy === 'high') {
      factors.push({ factor: 'High autonomy', impact: 'increases', weight: 0.25, evidence: 'System makes decisions with limited oversight', score: 0.8 });
      riskScore += 0.25;
    } else if (systemInfo.autonomy === 'medium') {
      factors.push({ factor: 'Medium autonomy', impact: 'neutral', weight: 0.15, evidence: 'System provides recommendations', score: 0.5 });
      riskScore += 0.15;
    }

    // 2. Affected population
    if (systemInfo.affectedPopulation === 'vulnerable') {
      factors.push({ factor: 'Vulnerable population affected', impact: 'increases', weight: 0.3, evidence: 'System affects vulnerable groups', score: 0.9 });
      riskScore += 0.3;
    } else if (systemInfo.affectedPopulation === 'general') {
      factors.push({ factor: 'General population affected', impact: 'increases', weight: 0.15, evidence: 'Wide population impact', score: 0.6 });
      riskScore += 0.15;
    }

    // 3. Human oversight
    if (!systemInfo.humanOversight) {
      factors.push({ factor: 'No human oversight', impact: 'increases', weight: 0.2, evidence: 'System operates without human review', score: 0.7 });
      riskScore += 0.2;
    } else {
      factors.push({ factor: 'Human oversight present', impact: 'decreases', weight: 0.1, evidence: 'Human review in place', score: 0.3 });
    }

    // 4. Use case specific risks
    const highRiskUseCases = ['employment', 'credit', 'education', 'healthcare', 'law-enforcement', 'migration'];
    if (highRiskUseCases.some(uc => systemInfo.useCase.toLowerCase().includes(uc))) {
      factors.push({ factor: 'High-risk use case', impact: 'increases', weight: 0.35, evidence: `Use case: ${systemInfo.useCase}`, score: 0.85 });
      riskScore += 0.35;
    }

    // Determine risk level
    const isProhibited = prohibitedChecks.some(c => c.applicable);
    let riskLevel: AIActRiskLevel;
    if (isProhibited) {
      riskLevel = 'unacceptable';
    } else if (riskScore >= 0.7) {
      riskLevel = 'high';
    } else if (riskScore >= 0.4) {
      riskLevel = 'limited';
    } else {
      riskLevel = 'minimal';
    }

    // Generate requirements based on risk level
    const requirements = this.getAIActRequirements(riskLevel);

    const classification: AIActClassification = {
      id: uuidv4(),
      systemId,
      timestamp: new Date().toISOString(),
      riskLevel,
      confidence: Math.min(1, 0.7 + (factors.length * 0.05)),
      factors,
      prohibitedChecks,
      requirements,
      assessor: 'AIOBS Compliance Engine',
      validated: false,
    };

    this.classifications.set(systemId, classification);
    return classification;
  }

  /**
   * Get AI Act classification for a system
   */
  getAIActClassification(systemId: string): AIActClassification | undefined {
    return this.classifications.get(systemId);
  }

  /**
   * Run compliance assessment
   */
  async runAssessment(resourceId: string, framework: string): Promise<ComplianceAssessment> {
    const frameworkDef = this.frameworks.get(framework);
    if (!frameworkDef) {
      throw new Error(`Framework ${framework} not found`);
    }

    const findings: ComplianceFinding[] = [];
    let totalScore = 0;
    let compliantCount = 0;

    // Evaluate each requirement
    for (const req of frameworkDef.requirements) {
      const finding = await this.evaluateRequirement(resourceId, req);
      findings.push(finding);

      if (finding.type === 'pass') {
        compliantCount++;
        totalScore += 1;
      } else if (finding.type === 'warning') {
        totalScore += 0.5;
      }
    }

    const score = frameworkDef.requirements.length > 0 ? totalScore / frameworkDef.requirements.length : 0;
    const status = score >= 0.9 ? 'compliant' as const : score >= 0.7 ? 'partial' as const : 'non-compliant' as const;

    const assessment: ComplianceAssessment = {
      id: uuidv4(),
      resourceId,
      resourceType: 'model',
      framework,
      timestamp: new Date().toISOString(),
      status,
      score,
      findings,
      gaps: findings.filter(f => f.type === 'fail').map(f => ({
        id: uuidv4(),
        requirementId: f.requirementId,
        requirement: f.title,
        currentState: 'Not implemented',
        targetState: 'Fully compliant',
        gapDescription: f.description,
        severity: f.severity,
        effort: 'medium' as const,
        remediation: {
          steps: [{ order: 1, action: f.remediation || 'Implement requirement', description: f.description, estimatedHours: 8 }],
          estimatedEffort: 8,
          priority: f.severity,
        },
      })),
      recommendations: [],
      evidence: [],
      assessor: { type: 'system', id: 'aiobs', name: 'AIOBS Compliance Engine' },
    };

    // Store assessment
    const existing = this.assessments.get(resourceId) || [];
    existing.push(assessment);
    this.assessments.set(resourceId, existing);

    return assessment;
  }

  /**
   * Get assessments for a resource
   */
  getAssessments(resourceId: string): ComplianceAssessment[] {
    return this.assessments.get(resourceId) || [];
  }

  /**
   * Run automated compliance check
   */
  async runCheck(checkId: string): Promise<CheckResult> {
    const check = this.checks.get(checkId);
    if (!check) {
      throw new Error(`Check ${checkId} not found`);
    }

    const startTime = Date.now();
    const findings: CheckResult['findings'] = [];

    // Simulate check execution
    const passed = Math.random() > 0.2;

    if (passed) {
      findings.push({
        type: 'pass',
        requirement: check.name,
        message: 'Check passed successfully',
      });
    } else {
      findings.push({
        type: 'fail',
        requirement: check.name,
        message: 'Check failed - remediation required',
        suggestedFix: 'Review and update configuration',
      });
    }

    const result: CheckResult = {
      id: uuidv4(),
      checkId,
      timestamp: new Date().toISOString(),
      status: passed ? 'passed' : 'failed',
      score: passed ? 1 : 0,
      findings,
      duration: Date.now() - startTime,
    };

    // Update check last run
    check.lastRun = new Date().toISOString();

    return result;
  }

  /**
   * Generate evidence package
   */
  generateEvidencePackage(resourceId: string, framework: string, period: { start: string; end: string }): EvidencePackage {
    const assessments = this.assessments.get(resourceId) || [];
    const relevantAssessments = assessments.filter(a =>
      a.framework === framework &&
      a.timestamp >= period.start &&
      a.timestamp <= period.end
    );

    const latestAssessment = relevantAssessments[relevantAssessments.length - 1];

    return {
      id: uuidv4(),
      requestId: uuidv4(),
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      framework,
      period,
      summary: {
        overallCompliance: latestAssessment?.status || 'not-applicable',
        score: latestAssessment?.score || 0,
        totalRequirements: latestAssessment?.findings.length || 0,
        compliantRequirements: latestAssessment?.findings.filter(f => f.type === 'pass').length || 0,
        partialRequirements: latestAssessment?.findings.filter(f => f.type === 'warning').length || 0,
        nonCompliantRequirements: latestAssessment?.findings.filter(f => f.type === 'fail').length || 0,
        criticalFindings: latestAssessment?.findings.filter(f => f.severity === 'critical').length || 0,
      },
      sections: latestAssessment?.findings.map(f => ({
        id: f.id,
        title: f.title,
        requirement: f.title,
        status: f.type === 'pass' ? 'compliant' as const : f.type === 'warning' ? 'partial' as const : 'non-compliant' as const,
        narrative: f.description,
        evidence: f.evidence?.map(e => ({
          type: 'documentation' as const,
          title: e,
          description: e,
          timestamp: new Date().toISOString(),
          source: 'AIOBS',
        })) || [],
      })) || [],
      attachments: [],
    };
  }

  /**
   * Get regulatory changes
   */
  getRegulatoryChanges(framework?: string): RegulatoryChange[] {
    if (framework) {
      return this.changes.filter(c => c.framework === framework);
    }
    return this.changes;
  }

  /**
   * Get compliance analytics
   */
  getAnalytics(): ComplianceAnalytics {
    const allAssessments = Array.from(this.assessments.values()).flat();
    const frameworks = Array.from(this.frameworks.values());

    const compliantCount = allAssessments.filter(a => a.status === 'compliant').length;
    const partialCount = allAssessments.filter(a => a.status === 'partial').length;
    const nonCompliantCount = allAssessments.filter(a => a.status === 'non-compliant').length;

    const totalFindings = allAssessments.reduce((sum, a) => sum + a.findings.length, 0);
    const compliantFindings = allAssessments.reduce((sum, a) => sum + a.findings.filter(f => f.type === 'pass').length, 0);

    return {
      timestamp: new Date().toISOString(),
      overview: {
        overallScore: totalFindings > 0 ? compliantFindings / totalFindings : 0,
        totalFrameworks: frameworks.length,
        compliantFrameworks: frameworks.filter(f => {
          const assessments = allAssessments.filter(a => a.framework === f.code);
          return assessments.length > 0 && assessments.every(a => a.status === 'compliant');
        }).length,
        totalRequirements: frameworks.reduce((sum, f) => sum + f.requirements.length, 0),
        compliantRequirements: compliantFindings,
        partialRequirements: allAssessments.reduce((sum, a) => sum + a.findings.filter(f => f.type === 'warning').length, 0),
        nonCompliantRequirements: allAssessments.reduce((sum, a) => sum + a.findings.filter(f => f.type === 'fail').length, 0),
        openFindings: allAssessments.reduce((sum, a) => sum + a.findings.filter(f => f.status === 'open').length, 0),
        criticalFindings: allAssessments.reduce((sum, a) => sum + a.findings.filter(f => f.severity === 'critical').length, 0),
        trend: { direction: 'increasing', magnitude: 0.05, periodDays: 30, significance: 0.7 },
      },
      byFramework: frameworks.map(f => {
        const fwAssessments = allAssessments.filter(a => a.framework === f.code);
        const latest = fwAssessments[fwAssessments.length - 1];
        return {
          framework: f.code,
          version: f.version,
          status: latest?.status || 'pending' as const,
          score: latest?.score || 0,
          requirements: {
            total: f.requirements.length,
            compliant: latest?.findings.filter(fd => fd.type === 'pass').length || 0,
            partial: latest?.findings.filter(fd => fd.type === 'warning').length || 0,
            nonCompliant: latest?.findings.filter(fd => fd.type === 'fail').length || 0,
            notAssessed: f.requirements.length - (latest?.findings.length || 0),
          },
          lastAssessment: latest?.timestamp || '',
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        };
      }),
      byResource: [],
      trends: {
        scoreHistory: [],
        findingsHistory: [],
        remediationRate: [],
      },
      upcomingDeadlines: [
        { id: uuidv4(), type: 'requirement', title: 'AI Act Documentation', description: 'Complete technical documentation', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'on-track', relatedResources: [] },
      ],
      recentChanges: this.changes.slice(-5),
      riskHeatmap: {
        categories: ['Data', 'Model', 'Governance', 'Security'],
        frameworks: ['AI Act', 'GDPR', 'ISO 27001'],
        data: [],
      },
    };
  }

  // Private helper methods

  private checkProhibitedUses(systemInfo: any): AIActClassification['prohibitedChecks'] {
    return [
      { category: 'subliminal-manipulation', applicable: false, confidence: 0.95 },
      { category: 'exploitation-vulnerable', applicable: systemInfo.affectedPopulation === 'vulnerable' && systemInfo.autonomy === 'high', confidence: 0.8 },
      { category: 'social-scoring', applicable: false, confidence: 0.95 },
      { category: 'real-time-biometric-public', applicable: false, confidence: 0.95 },
    ];
  }

  private getAIActRequirements(riskLevel: AIActRiskLevel): AIActClassification['requirements'] {
    const requirements: AIActClassification['requirements'] = [];

    if (riskLevel === 'high' || riskLevel === 'unacceptable') {
      requirements.push(
        { article: 'Article 9', title: 'Risk Management System', description: 'Establish and maintain risk management system', applicableRiskLevels: ['high'], status: 'not-assessed' },
        { article: 'Article 10', title: 'Data Governance', description: 'Ensure data governance and management', applicableRiskLevels: ['high'], status: 'not-assessed' },
        { article: 'Article 11', title: 'Technical Documentation', description: 'Prepare technical documentation', applicableRiskLevels: ['high'], status: 'not-assessed' },
        { article: 'Article 12', title: 'Record-Keeping', description: 'Automatic logging of events', applicableRiskLevels: ['high'], status: 'not-assessed' },
        { article: 'Article 13', title: 'Transparency', description: 'Design for transparency', applicableRiskLevels: ['high'], status: 'not-assessed' },
        { article: 'Article 14', title: 'Human Oversight', description: 'Enable human oversight', applicableRiskLevels: ['high'], status: 'not-assessed' },
        { article: 'Article 15', title: 'Accuracy & Robustness', description: 'Ensure accuracy and robustness', applicableRiskLevels: ['high'], status: 'not-assessed' },
      );
    }

    if (riskLevel === 'limited') {
      requirements.push(
        { article: 'Article 52', title: 'Transparency Obligations', description: 'Inform users of AI interaction', applicableRiskLevels: ['limited'], status: 'not-assessed' },
      );
    }

    return requirements;
  }

  private async evaluateRequirement(resourceId: string, req: Requirement): Promise<ComplianceFinding> {
    // Simulated evaluation - in production, run actual checks
    const passed = Math.random() > 0.3;

    return {
      id: uuidv4(),
      requirementId: req.id,
      type: passed ? 'pass' : Math.random() > 0.5 ? 'warning' : 'fail',
      severity: passed ? 'info' : Math.random() > 0.7 ? 'critical' : 'high',
      title: req.title,
      description: req.description,
      remediation: passed ? undefined : `Implement ${req.title}`,
      status: 'open',
    };
  }

  private initializeFrameworks(): void {
    // AI Act Framework
    this.frameworks.set('ai-act', {
      id: uuidv4(),
      code: 'ai-act',
      name: 'EU AI Act',
      version: '2024',
      jurisdiction: ['EU'],
      effectiveDate: '2024-08-01',
      description: 'European Union Artificial Intelligence Act',
      categories: [
        { id: 'risk-management', name: 'Risk Management', description: 'Risk management requirements', requirements: [], weight: 1 },
        { id: 'data-governance', name: 'Data Governance', description: 'Data governance requirements', requirements: [], weight: 1 },
        { id: 'transparency', name: 'Transparency', description: 'Transparency requirements', requirements: [], weight: 1 },
      ],
      requirements: [
        { id: uuidv4(), code: 'AI-ACT-9', frameworkId: 'ai-act', category: 'risk-management', title: 'Risk Management System', description: 'Establish risk management system', level: 'mandatory', applicability: [], controls: [], evidence: [] },
        { id: uuidv4(), code: 'AI-ACT-10', frameworkId: 'ai-act', category: 'data-governance', title: 'Data Governance', description: 'Ensure data governance', level: 'mandatory', applicability: [], controls: [], evidence: [] },
        { id: uuidv4(), code: 'AI-ACT-11', frameworkId: 'ai-act', category: 'transparency', title: 'Technical Documentation', description: 'Prepare documentation', level: 'mandatory', applicability: [], controls: [], evidence: [] },
        { id: uuidv4(), code: 'AI-ACT-13', frameworkId: 'ai-act', category: 'transparency', title: 'Transparency', description: 'Design for transparency', level: 'mandatory', applicability: [], controls: [], evidence: [] },
        { id: uuidv4(), code: 'AI-ACT-14', frameworkId: 'ai-act', category: 'risk-management', title: 'Human Oversight', description: 'Enable human oversight', level: 'mandatory', applicability: [], controls: [], evidence: [] },
      ],
      metadata: { publisher: 'European Commission', lastUpdated: new Date().toISOString() },
    });

    // GDPR Framework
    this.frameworks.set('gdpr', {
      id: uuidv4(),
      code: 'gdpr',
      name: 'GDPR',
      version: '2018',
      jurisdiction: ['EU'],
      effectiveDate: '2018-05-25',
      description: 'General Data Protection Regulation',
      categories: [],
      requirements: [
        { id: uuidv4(), code: 'GDPR-5', frameworkId: 'gdpr', category: 'data-protection', title: 'Data Processing Principles', description: 'Lawfulness, fairness, transparency', level: 'mandatory', applicability: [], controls: [], evidence: [] },
        { id: uuidv4(), code: 'GDPR-22', frameworkId: 'gdpr', category: 'automated-decision', title: 'Automated Decision Making', description: 'Rights related to automated decisions', level: 'mandatory', applicability: [], controls: [], evidence: [] },
      ],
      metadata: { publisher: 'European Commission', lastUpdated: new Date().toISOString() },
    });
  }

  private initializeDemoData(): void {
    // Add sample regulatory changes
    this.changes.push({
      id: uuidv4(),
      framework: 'ai-act',
      type: 'clarification',
      severity: 'significant',
      title: 'Updated guidance on high-risk AI systems',
      description: 'New guidance clarifying requirements for high-risk AI system documentation',
      effectiveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      publishedDate: new Date().toISOString(),
      source: 'European Commission',
      affectedRequirements: ['AI-ACT-11'],
      status: 'pending',
    });

    // Add sample automated checks
    this.checks.set('data-governance-check', {
      id: 'data-governance-check',
      name: 'Data Governance Check',
      description: 'Verify data governance requirements',
      framework: 'ai-act',
      requirements: ['AI-ACT-10'],
      type: 'data-quality',
      schedule: { type: 'interval', interval: 86400000 },
      config: {},
      enabled: true,
    });
  }
}

// Export singleton instance
export const complianceEngine = new ComplianceEngine();
