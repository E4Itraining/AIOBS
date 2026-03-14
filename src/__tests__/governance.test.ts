/**
 * Governance Module Tests
 *
 * Tests for Compartment Manager — security compartmentalization
 * for defense-grade data isolation.
 */

import { CompartmentManager } from '../governance/classification/compartment-manager';
import type { CompartmentAccessRequest } from '../governance/classification/compartment-manager';

describe('CompartmentManager', () => {
  let manager: CompartmentManager;

  beforeEach(() => {
    manager = new CompartmentManager();
  });

  it('should initialize with default compartments', () => {
    const compartments = manager.getCompartments();
    expect(compartments.length).toBeGreaterThanOrEqual(3);

    const names = compartments.map(c => c.name);
    expect(names).toContain('Public Telemetry');
    expect(names).toContain('SOC Operations');
    expect(names).toContain('Threat Intelligence');
  });

  it('should grant access with sufficient clearance', () => {
    const compartments = manager.getCompartments();
    const publicCompartment = compartments.find(c => c.name === 'Public Telemetry');
    expect(publicCompartment).toBeDefined();

    manager.setUserClearance('user-001', 'DIFFUSION_RESTREINTE');

    const request: CompartmentAccessRequest = {
      requestId: 'req-001',
      userId: 'user-001',
      compartmentId: publicCompartment!.id,
      operation: 'read',
      justification: 'SOC monitoring',
      timestamp: new Date().toISOString(),
    };

    const result = manager.requestAccess(request);
    expect(result.granted).toBe(true);
  });

  it('should deny access with insufficient clearance', () => {
    const compartments = manager.getCompartments();
    const classifiedCompartment = compartments.find(c => c.name === 'Threat Intelligence');
    expect(classifiedCompartment).toBeDefined();

    // User only has NON_PROTEGE clearance
    manager.setUserClearance('user-002', 'NON_PROTEGE');

    const request: CompartmentAccessRequest = {
      requestId: 'req-002',
      userId: 'user-002',
      compartmentId: classifiedCompartment!.id,
      operation: 'read',
      justification: 'Curiosity',
      timestamp: new Date().toISOString(),
    };

    const result = manager.requestAccess(request);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('Insufficient clearance');
  });

  it('should deny access for unregistered users', () => {
    const compartments = manager.getCompartments();

    const request: CompartmentAccessRequest = {
      requestId: 'req-003',
      userId: 'unknown-user',
      compartmentId: compartments[0].id,
      operation: 'read',
      justification: 'test',
      timestamp: new Date().toISOString(),
    };

    const result = manager.requestAccess(request);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('no registered clearance');
  });

  it('should prevent data flow from higher to lower classification', () => {
    const compartments = manager.getCompartments();
    const classified = compartments.find(c => c.classification === 'CONFIDENTIEL_DEFENSE');
    const publicComp = compartments.find(c => c.classification === 'NON_PROTEGE');

    expect(classified).toBeDefined();
    expect(publicComp).toBeDefined();

    const result = manager.checkDataFlow(classified!.id, publicComp!.id);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('declassification required');
  });

  it('should allow data flow from lower to higher classification', () => {
    const compartments = manager.getCompartments();
    const publicComp = compartments.find(c => c.classification === 'NON_PROTEGE');
    const socComp = compartments.find(c => c.classification === 'DIFFUSION_RESTREINTE');

    expect(publicComp).toBeDefined();
    expect(socComp).toBeDefined();

    const result = manager.checkDataFlow(publicComp!.id, socComp!.id);
    expect(result.allowed).toBe(true);
  });

  it('should maintain audit log', () => {
    const compartments = manager.getCompartments();
    manager.setUserClearance('audit-user', 'DIFFUSION_RESTREINTE');

    const request: CompartmentAccessRequest = {
      requestId: 'audit-req',
      userId: 'audit-user',
      compartmentId: compartments[0].id,
      operation: 'read',
      justification: 'Audit test',
      timestamp: new Date().toISOString(),
    };

    manager.requestAccess(request);

    const log = manager.getAuditLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[log.length - 1].userId).toBe('audit-user');
    expect(log[log.length - 1].operation).toBe('read');
  });

  it('should deny disallowed operations', () => {
    const compartments = manager.getCompartments();
    const classified = compartments.find(c => c.name === 'Threat Intelligence');
    expect(classified).toBeDefined();

    manager.setUserClearance('user-op', 'CONFIDENTIEL_DEFENSE');

    // Threat Intelligence compartment only allows read and write, not export
    const request: CompartmentAccessRequest = {
      requestId: 'op-req',
      userId: 'user-op',
      compartmentId: classified!.id,
      operation: 'export',
      justification: 'Need to export',
      timestamp: new Date().toISOString(),
    };

    const result = manager.requestAccess(request);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('not permitted');
  });
});
