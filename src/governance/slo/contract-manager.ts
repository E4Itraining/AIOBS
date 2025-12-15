/**
 * AI Contract Manager
 * Manages AI system contracts including SLOs, terms, and lifecycle
 */

import {
  AIContract,
  AISLODefinition,
  ContractTerms,
  ContractStatus,
  Guarantee,
  Penalty,
  Remedy,
} from '../../core/types/slo';
import { UUID, ISO8601, ActorIdentity, ResourceIdentifier, TimeWindow } from '../../core/types/common';

/**
 * AI Contract Manager
 */
export class AIContractManager {
  private contracts: Map<UUID, AIContract> = new Map();

  /**
   * Create a new AI contract
   */
  createContract(params: CreateContractParams): AIContract {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    const contract: AIContract = {
      id,
      name: params.name,
      description: params.description,
      version: '1.0.0',
      provider: params.provider,
      consumer: params.consumer,
      resources: params.resources,
      slos: params.slos,
      terms: params.terms,
      status: 'draft',
      effectiveFrom: params.effectiveFrom,
      effectiveUntil: params.effectiveUntil,
      createdAt: timestamp,
      reviewSchedule: params.reviewSchedule || { duration: 90, unit: 'days' },
    };

    this.contracts.set(id, contract);
    return contract;
  }

  /**
   * Submit contract for approval
   */
  submitForApproval(contractId: UUID): AIContract {
    const contract = this.getContract(contractId);

    if (contract.status !== 'draft') {
      throw new Error(`Contract ${contractId} is not in draft status`);
    }

    contract.status = 'pending_approval';
    return contract;
  }

  /**
   * Approve a contract
   */
  approveContract(contractId: UUID, approver: ActorIdentity): AIContract {
    const contract = this.getContract(contractId);

    if (contract.status !== 'pending_approval') {
      throw new Error(`Contract ${contractId} is not pending approval`);
    }

    contract.status = 'active';
    contract.approvedAt = new Date().toISOString();

    return contract;
  }

  /**
   * Suspend a contract
   */
  suspendContract(contractId: UUID, reason: string): AIContract {
    const contract = this.getContract(contractId);

    if (contract.status !== 'active') {
      throw new Error(`Contract ${contractId} is not active`);
    }

    contract.status = 'suspended';
    return contract;
  }

  /**
   * Terminate a contract
   */
  terminateContract(contractId: UUID, reason: string): AIContract {
    const contract = this.getContract(contractId);

    contract.status = 'terminated';
    contract.terminatedAt = new Date().toISOString();

    return contract;
  }

  /**
   * Get contract by ID
   */
  getContract(contractId: UUID): AIContract {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }
    return contract;
  }

  /**
   * Get all contracts
   */
  getAllContracts(): AIContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Get contracts by status
   */
  getContractsByStatus(status: ContractStatus): AIContract[] {
    return this.getAllContracts().filter(c => c.status === status);
  }

  /**
   * Get contracts for a resource
   */
  getContractsForResource(resourceId: UUID): AIContract[] {
    return this.getAllContracts().filter(c =>
      c.resources.some(r => r.id === resourceId)
    );
  }

  /**
   * Check if contract is due for review
   */
  isDueForReview(contractId: UUID): boolean {
    const contract = this.getContract(contractId);

    if (!contract.lastReviewedAt) {
      return true;
    }

    const lastReview = new Date(contract.lastReviewedAt).getTime();
    const reviewIntervalMs = this.timeWindowToMs(contract.reviewSchedule);
    const nextReview = lastReview + reviewIntervalMs;

    return Date.now() >= nextReview;
  }

  /**
   * Record contract review
   */
  recordReview(contractId: UUID, reviewer: ActorIdentity): AIContract {
    const contract = this.getContract(contractId);
    const timestamp = new Date().toISOString();

    contract.lastReviewedAt = timestamp;
    contract.nextReviewAt = new Date(
      Date.now() + this.timeWindowToMs(contract.reviewSchedule)
    ).toISOString();

    return contract;
  }

  /**
   * Add SLO to contract
   */
  addSLO(contractId: UUID, slo: AISLODefinition): AIContract {
    const contract = this.getContract(contractId);

    if (contract.status !== 'draft') {
      throw new Error('Can only modify draft contracts');
    }

    contract.slos.push(slo);
    return contract;
  }

  /**
   * Remove SLO from contract
   */
  removeSLO(contractId: UUID, sloId: UUID): AIContract {
    const contract = this.getContract(contractId);

    if (contract.status !== 'draft') {
      throw new Error('Can only modify draft contracts');
    }

    contract.slos = contract.slos.filter(s => s.id !== sloId);
    return contract;
  }

  /**
   * Create new contract version
   */
  createNewVersion(contractId: UUID): AIContract {
    const original = this.getContract(contractId);

    const newContract = { ...original };
    newContract.id = this.generateId();
    newContract.version = this.incrementVersion(original.version);
    newContract.status = 'draft';
    newContract.createdAt = new Date().toISOString();
    delete newContract.approvedAt;
    delete newContract.terminatedAt;
    delete newContract.lastReviewedAt;
    delete newContract.nextReviewAt;

    this.contracts.set(newContract.id, newContract);
    return newContract;
  }

  /**
   * Validate contract completeness
   */
  validateContract(contractId: UUID): ContractValidationResult {
    const contract = this.getContract(contractId);
    const issues: ValidationIssue[] = [];

    // Check required fields
    if (!contract.name) {
      issues.push({ field: 'name', message: 'Contract name is required', severity: 'error' });
    }
    if (!contract.provider) {
      issues.push({ field: 'provider', message: 'Provider is required', severity: 'error' });
    }
    if (!contract.consumer) {
      issues.push({ field: 'consumer', message: 'Consumer is required', severity: 'error' });
    }
    if (contract.resources.length === 0) {
      issues.push({ field: 'resources', message: 'At least one resource is required', severity: 'error' });
    }
    if (contract.slos.length === 0) {
      issues.push({ field: 'slos', message: 'At least one SLO is required', severity: 'error' });
    }

    // Check dates
    if (new Date(contract.effectiveFrom) >= new Date(contract.effectiveUntil)) {
      issues.push({ field: 'dates', message: 'Effective from must be before effective until', severity: 'error' });
    }

    // Check SLOs have objectives
    for (const slo of contract.slos) {
      if (slo.objectives.length === 0) {
        issues.push({ field: `slo.${slo.id}`, message: `SLO ${slo.name} has no objectives`, severity: 'warning' });
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  /**
   * Generate contract summary
   */
  generateSummary(contractId: UUID): ContractSummary {
    const contract = this.getContract(contractId);

    return {
      id: contract.id,
      name: contract.name,
      status: contract.status,
      provider: contract.provider.name,
      consumer: contract.consumer.name,
      resourceCount: contract.resources.length,
      sloCount: contract.slos.length,
      effectiveFrom: contract.effectiveFrom,
      effectiveUntil: contract.effectiveUntil,
      daysUntilExpiry: Math.ceil(
        (new Date(contract.effectiveUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      ),
      isDueForReview: this.isDueForReview(contractId),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Increment version string
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[parts.length - 1]++;
    return parts.join('.');
  }

  /**
   * Convert time window to milliseconds
   */
  private timeWindowToMs(window: TimeWindow): number {
    const multipliers: Record<TimeWindow['unit'], number> = {
      'seconds': 1000,
      'minutes': 60 * 1000,
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000,
      'weeks': 7 * 24 * 60 * 60 * 1000,
      'months': 30 * 24 * 60 * 60 * 1000,
    };

    return window.duration * multipliers[window.unit];
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
 * Parameters for creating a contract
 */
export interface CreateContractParams {
  name: string;
  description: string;
  provider: ActorIdentity;
  consumer: ActorIdentity;
  resources: ResourceIdentifier[];
  slos: AISLODefinition[];
  terms: ContractTerms;
  effectiveFrom: ISO8601;
  effectiveUntil: ISO8601;
  reviewSchedule?: TimeWindow;
}

/**
 * Contract validation result
 */
export interface ContractValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Contract summary
 */
export interface ContractSummary {
  id: UUID;
  name: string;
  status: ContractStatus;
  provider: string;
  consumer: string;
  resourceCount: number;
  sloCount: number;
  effectiveFrom: ISO8601;
  effectiveUntil: ISO8601;
  daysUntilExpiry: number;
  isDueForReview: boolean;
}
