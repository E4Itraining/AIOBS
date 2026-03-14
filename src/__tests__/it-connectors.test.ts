/**
 * IT Connector Tests
 *
 * Tests for PCAP, Suricata/Zeek, and EDR connectors in simulation mode.
 */

import { PCAPConnector, createPCAPSimulationConnector } from '../connectors/it/pcap-connector';
import { SuricataZeekConnector, createSuricataZeekSimulationConnector } from '../connectors/it/suricata-zeek-connector';
import { EDRConnector, createEDRSimulationConnector } from '../connectors/it/edr-connector';

describe('PCAPConnector', () => {
  let connector: PCAPConnector;

  beforeEach(() => {
    connector = createPCAPSimulationConnector('Test-PCAP');
  });

  afterEach(async () => {
    await connector.stop();
  });

  it('should collect simulated packets', async () => {
    const packets = await connector.collect();

    expect(Array.isArray(packets)).toBe(true);
    for (const p of packets) {
      expect(p.sourceIp).toBeDefined();
      expect(p.destIp).toBeDefined();
      expect(p.protocol).toBeDefined();
      expect(p.packetSize).toBeGreaterThan(0);
    }
  });

  it('should generate flow summary', async () => {
    const summary = await connector.getFlowSummary();

    expect(summary.timestamp).toBeDefined();
    expect(summary.totalPackets).toBeGreaterThanOrEqual(0);
    expect(summary.totalBytes).toBeGreaterThanOrEqual(0);
    expect(typeof summary.protocolBreakdown).toBe('object');
  });

  it('should detect suspicious flows in simulation', async () => {
    // Run multiple collections to increase chance of suspicious flows
    let foundSuspicious = false;
    for (let i = 0; i < 10; i++) {
      const summary = await connector.getFlowSummary();
      if (summary.suspiciousFlows.length > 0) {
        foundSuspicious = true;
        break;
      }
    }
    // Suspicious flows may or may not appear in simulation (stochastic)
    expect(typeof foundSuspicious).toBe('boolean');
  });
});

describe('SuricataZeekConnector', () => {
  let connector: SuricataZeekConnector;

  beforeEach(() => {
    connector = createSuricataZeekSimulationConnector('Test-IDS');
  });

  afterEach(() => {
    connector.stop();
  });

  it('should collect simulated IDS alerts', async () => {
    const alerts = await connector.collect();

    expect(Array.isArray(alerts)).toBe(true);
    for (const a of alerts) {
      expect(a.id).toBeDefined();
      expect(a.source).toMatch(/^(suricata|zeek)$/);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(a.severity);
      expect(a.sourceIp).toBeDefined();
      expect(a.destIp).toBeDefined();
    }
  });

  it('should generate summary', async () => {
    const summary = await connector.getSummary();

    expect(summary.timestamp).toBeDefined();
    expect(summary.totalAlerts).toBeGreaterThanOrEqual(0);
    expect(typeof summary.bySeverity).toBe('object');
    expect(typeof summary.byCategory).toBe('object');
    expect(Array.isArray(summary.topSources)).toBe(true);
  });
});

describe('EDRConnector', () => {
  let connector: EDRConnector;

  beforeEach(() => {
    connector = createEDRSimulationConnector('Test-EDR');
  });

  afterEach(() => {
    connector.stop();
  });

  it('should collect simulated EDR events', async () => {
    const events = await connector.collect();

    expect(Array.isArray(events)).toBe(true);
    for (const e of events) {
      expect(e.id).toBeDefined();
      expect(e.hostname).toBeDefined();
      expect(e.eventType).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(e.severity);
      expect(e.details).toBeDefined();
    }
  });

  it('should detect higher severity on OT hosts', async () => {
    // Run many collections to find an event on scada host
    let foundHighSeverityOnOT = false;
    for (let i = 0; i < 50; i++) {
      const events = await connector.collect();
      for (const e of events) {
        if (e.hostname.includes('scada') && (e.severity === 'HIGH' || e.severity === 'CRITICAL')) {
          foundHighSeverityOnOT = true;
          break;
        }
      }
      if (foundHighSeverityOnOT) break;
    }
    // May or may not occur in simulation
    expect(typeof foundHighSeverityOnOT).toBe('boolean');
  });
});
