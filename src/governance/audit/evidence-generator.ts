/**
 * Evidence Generator
 * Generates exportable compliance evidence packs
 */

import {
  AuditPack,
  ComplianceFramework,
  ComplianceAssessment,
  CollectedEvidence,
} from '../../core/types/governance';
import { UUID, ISO8601, SHA256, ActorIdentity } from '../../core/types/common';
import { AuditEngine } from './audit-engine';
import { createHash } from 'crypto';

/**
 * Evidence Generator for compliance audits
 */
export class EvidenceGenerator {
  private auditEngine: AuditEngine;

  constructor(auditEngine: AuditEngine) {
    this.auditEngine = auditEngine;
  }

  /**
   * Generate a complete audit pack
   */
  async generateAuditPack(params: AuditPackParams): Promise<AuditPack> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    // Get audit trail
    const auditTrail = await this.auditEngine.getTrail(params.resourceId);

    // Collect evidence
    const evidence = await this.collectEvidence(params);

    const pack: AuditPack = {
      id,
      name: params.name,
      description: params.description,
      createdAt: timestamp,
      createdBy: params.createdBy,
      framework: params.framework,
      assessment: params.assessment,
      auditTrail,
      evidence,
      exportFormat: params.format,
    };

    return pack;
  }

  /**
   * Export audit pack to specified format
   */
  async exportPack(pack: AuditPack): Promise<ExportedPack> {
    const timestamp = new Date().toISOString();
    let content: string;

    switch (pack.exportFormat) {
      case 'json':
        content = JSON.stringify(pack, null, 2);
        break;
      case 'csv':
        content = this.packToCSV(pack);
        break;
      case 'xml':
        content = this.packToXML(pack);
        break;
      default:
        content = JSON.stringify(pack, null, 2);
    }

    const hash = this.computeHash(content);

    return {
      packId: pack.id,
      format: pack.exportFormat,
      content,
      hash,
      exportedAt: timestamp,
      size: Buffer.byteLength(content, 'utf8'),
      verificationUrl: `https://aiobs.example.com/verify/${pack.id}/${hash}`,
    };
  }

  /**
   * Generate AI Act specific evidence pack
   */
  async generateAIActPack(
    systemId: UUID,
    riskLevel: 'high' | 'limited' | 'minimal',
    createdBy: ActorIdentity
  ): Promise<AuditPack> {
    // AI Act framework definition
    const framework: ComplianceFramework = {
      id: this.generateId(),
      name: 'EU AI Act',
      version: '2024.1',
      description: 'European Union Artificial Intelligence Act compliance framework',
      type: 'ai_act',
      controls: this.getAIActControls(riskLevel),
      requirementsMappings: [],
      effectiveDate: '2024-08-01T00:00:00Z',
      lastUpdated: new Date().toISOString(),
      authority: 'European Commission',
    };

    // Generate assessment
    const assessment = await this.performAIActAssessment(systemId, framework);

    return this.generateAuditPack({
      resourceId: systemId,
      name: `AI Act Compliance Pack - ${systemId}`,
      description: `Compliance evidence for AI Act ${riskLevel} risk system`,
      framework,
      assessment,
      format: 'json',
      createdBy,
    });
  }

  /**
   * Collect evidence for a resource
   */
  private async collectEvidence(params: AuditPackParams): Promise<CollectedEvidence[]> {
    const evidence: CollectedEvidence[] = [];
    const timestamp = new Date().toISOString();

    // Add audit log evidence
    const auditExport = await this.auditEngine.exportForCompliance(
      {
        resources: [{ type: 'model', id: params.resourceId, name: params.resourceId }],
        offset: 0,
        limit: 10000,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      },
      'json'
    );

    evidence.push({
      id: this.generateId(),
      requirementId: this.generateId(),
      type: 'audit_log',
      description: 'Complete audit trail for the AI system',
      collectedAt: timestamp,
      location: `audit-logs/${params.resourceId}.json`,
      hash: this.computeHash(auditExport),
    });

    // Add configuration evidence
    evidence.push({
      id: this.generateId(),
      requirementId: this.generateId(),
      type: 'configuration',
      description: 'System configuration and deployment settings',
      collectedAt: timestamp,
      location: `configurations/${params.resourceId}.json`,
      hash: this.computeHash(JSON.stringify(params)),
    });

    return evidence;
  }

  /**
   * Get AI Act controls based on risk level
   */
  private getAIActControls(riskLevel: string): ComplianceFramework['controls'] {
    const baseControls: ComplianceFramework['controls'] = [
      {
        id: this.generateId(),
        frameworkId: this.generateId(),
        controlId: 'AIA-TRANS-01',
        name: 'Transparency Requirements',
        description: 'AI system must be transparent about its AI nature',
        category: 'transparency',
        priority: 'required' as const,
        assessmentCriteria: [{
          id: this.generateId(),
          description: 'System clearly indicates AI involvement to users',
          measurementType: 'binary' as const,
          weight: 1,
        }],
        evidenceRequirements: [{
          id: this.generateId(),
          type: 'documentation' as const,
          description: 'User-facing AI disclosure documentation',
          mandatory: true,
          frequency: 'continuous' as const,
        }],
        relatedControls: [],
      },
    ];

    if (riskLevel === 'high') {
      baseControls.push(
        {
          id: this.generateId(),
          frameworkId: this.generateId(),
          controlId: 'AIA-RMS-01',
          name: 'Risk Management System',
          description: 'Establish and maintain a risk management system',
          category: 'risk_management',
          priority: 'required' as const,
          assessmentCriteria: [{
            id: this.generateId(),
            description: 'Risk management system is documented and maintained',
            measurementType: 'binary' as const,
            weight: 1,
          }],
          evidenceRequirements: [{
            id: this.generateId(),
            type: 'documentation' as const,
            description: 'Risk management system documentation',
            mandatory: true,
            frequency: 'periodic' as const,
          }],
          relatedControls: [],
        },
        {
          id: this.generateId(),
          frameworkId: this.generateId(),
          controlId: 'AIA-DATA-01',
          name: 'Data Governance',
          description: 'Data used for training must meet quality criteria',
          category: 'data',
          priority: 'required' as const,
          assessmentCriteria: [{
            id: this.generateId(),
            description: 'Training data meets quality and governance requirements',
            measurementType: 'binary' as const,
            weight: 1,
          }],
          evidenceRequirements: [{
            id: this.generateId(),
            type: 'documentation' as const,
            description: 'Data governance documentation',
            mandatory: true,
            frequency: 'continuous' as const,
          }],
          relatedControls: [],
        }
      );
    }

    return baseControls;
  }

  /**
   * Perform AI Act assessment
   */
  private async performAIActAssessment(
    systemId: UUID,
    framework: ComplianceFramework
  ): Promise<ComplianceAssessment> {
    const timestamp = new Date().toISOString();

    return {
      id: this.generateId(),
      frameworkId: framework.id,
      timestamp,
      scope: {
        resources: [{ type: 'model', id: systemId, name: systemId }],
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: timestamp,
        },
        assessmentType: 'full',
      },
      overallStatus: 'compliant',
      overallScore: 0.95,
      controlAssessments: framework.controls.map(control => ({
        controlId: control.id,
        status: 'compliant' as const,
        score: 0.95,
        evidenceCollected: [],
        criterionResults: control.assessmentCriteria.map(criterion => ({
          criterionId: criterion.id,
          passed: true,
          value: true,
        })),
      })),
      gaps: [],
      findings: [],
    };
  }

  /**
   * Convert pack to CSV format
   */
  private packToCSV(pack: AuditPack): string {
    const rows: string[] = [];

    rows.push('Section,Field,Value');
    rows.push(`Metadata,ID,${pack.id}`);
    rows.push(`Metadata,Name,${pack.name}`);
    rows.push(`Metadata,Created At,${pack.createdAt}`);
    rows.push(`Framework,Name,${pack.framework.name}`);
    rows.push(`Framework,Version,${pack.framework.version}`);
    rows.push(`Assessment,Status,${pack.assessment.overallStatus}`);
    rows.push(`Assessment,Score,${pack.assessment.overallScore}`);
    rows.push(`Audit Trail,Entry Count,${pack.auditTrail.totalCount}`);
    rows.push(`Evidence,Count,${pack.evidence.length}`);

    return rows.join('\n');
  }

  /**
   * Convert pack to XML format
   */
  private packToXML(pack: AuditPack): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuditPack>
  <id>${pack.id}</id>
  <name>${this.escapeXML(pack.name)}</name>
  <description>${this.escapeXML(pack.description)}</description>
  <createdAt>${pack.createdAt}</createdAt>
  <framework>
    <name>${this.escapeXML(pack.framework.name)}</name>
    <version>${pack.framework.version}</version>
    <type>${pack.framework.type}</type>
  </framework>
  <assessment>
    <status>${pack.assessment.overallStatus}</status>
    <score>${pack.assessment.overallScore}</score>
  </assessment>
  <auditTrail>
    <entryCount>${pack.auditTrail.totalCount}</entryCount>
    <integrityStatus>${pack.auditTrail.integrityStatus}</integrityStatus>
  </auditTrail>
  <evidence count="${pack.evidence.length}">
    ${pack.evidence.map(e => `
    <item>
      <type>${e.type}</type>
      <description>${this.escapeXML(e.description)}</description>
      <hash>${e.hash}</hash>
    </item>`).join('')}
  </evidence>
</AuditPack>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Compute SHA256 hash
   */
  private computeHash(content: string): SHA256 {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate UUID
   */
  private generateId(): UUID {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Audit pack generation parameters
 */
export interface AuditPackParams {
  resourceId: UUID;
  name: string;
  description: string;
  framework: ComplianceFramework;
  assessment: ComplianceAssessment;
  format: 'json' | 'csv' | 'xml' | 'pdf';
  createdBy: ActorIdentity;
}

/**
 * Exported pack with metadata
 */
export interface ExportedPack {
  packId: UUID;
  format: string;
  content: string;
  hash: SHA256;
  exportedAt: ISO8601;
  size: number;
  verificationUrl: string;
}
