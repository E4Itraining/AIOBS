/**
 * Multi-Agent Observability Engine
 *
 * Comprehensive observability for multi-agent AI systems including:
 * - Agent topology tracking
 * - Decision trace recording
 * - Anomaly detection
 * - Cost attribution
 * - Performance analytics
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentRegistryEntry,
  AgentSession,
  AgentTopologyGraph,
  DecisionTrace,
  DecisionStep,
  AnomalyReport,
  AgentAnomaly,
  OrchestrationExperiment,
  ExperimentAnalysis,
  AgentCostAttribution,
  MultiAgentAnalytics,
  AgentNode,
  AgentConnection,
  ToolNode,
  SessionMetrics,
} from '../types/multi-agent';
import { NormalizedScore } from '../types/common';

/**
 * Multi-Agent Observability Engine
 */
export class MultiAgentEngine {
  private registry: Map<string, AgentRegistryEntry> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private traces: Map<string, DecisionTrace[]> = new Map();
  private experiments: Map<string, OrchestrationExperiment> = new Map();

  constructor() {
    this.initializeDemoData();
  }

  /**
   * Register an agent
   */
  registerAgent(agent: Omit<AgentRegistryEntry, 'id' | 'registeredAt' | 'lastActiveAt'>): AgentRegistryEntry {
    const entry: AgentRegistryEntry = {
      ...agent,
      id: uuidv4(),
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    this.registry.set(entry.id, entry);
    return entry;
  }

  /**
   * Get all registered agents
   */
  getAgents(): AgentRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentRegistryEntry | undefined {
    return this.registry.get(id);
  }

  /**
   * Start a new session
   */
  startSession(initiator: AgentSession['initiator'], rootRequest: string): AgentSession {
    const session: AgentSession = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      status: 'running',
      initiator,
      agents: [],
      rootRequest,
      metrics: {
        totalDurationMs: 0,
        totalAgentCalls: 0,
        totalToolCalls: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        uniqueAgents: 0,
        maxConcurrency: 0,
        successfulSteps: 0,
        failedSteps: 0,
      },
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * End a session
   */
  endSession(sessionId: string, status: AgentSession['status'], finalResponse?: string): AgentSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.endTime = new Date().toISOString();
      session.finalResponse = finalResponse;
      session.metrics.totalDurationMs = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
    }
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get all sessions
   */
  getSessions(limit = 100): AgentSession[] {
    return Array.from(this.sessions.values()).slice(-limit);
  }

  /**
   * Record a decision step
   */
  recordStep(sessionId: string, agentId: string, step: Omit<DecisionStep, 'id' | 'sequence' | 'timestamp'>): DecisionStep {
    const traces = this.traces.get(sessionId) || [];
    let trace = traces.find(t => t.agentId === agentId);

    if (!trace) {
      trace = {
        sessionId,
        agentId,
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
        steps: [],
        totalDuration: 0,
        outcome: 'success',
      };
      traces.push(trace);
      this.traces.set(sessionId, traces);
    }

    const newStep: DecisionStep = {
      ...step,
      id: uuidv4(),
      sequence: trace.steps.length + 1,
      timestamp: new Date().toISOString(),
    };

    trace.steps.push(newStep);
    trace.totalDuration += step.duration;

    // Update session metrics
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metrics.totalAgentCalls++;
      session.metrics.totalTokens += step.tokens.total;
      session.metrics.inputTokens += step.tokens.input;
      session.metrics.outputTokens += step.tokens.output;
      session.metrics.totalCost += step.cost;
      if (step.status === 'success') {
        session.metrics.successfulSteps++;
      } else if (step.status === 'error') {
        session.metrics.failedSteps++;
      }
    }

    return newStep;
  }

  /**
   * Get decision traces for a session
   */
  getTraces(sessionId: string): DecisionTrace[] {
    return this.traces.get(sessionId) || [];
  }

  /**
   * Build topology graph for a session
   */
  buildTopologyGraph(sessionId: string): AgentTopologyGraph {
    const session = this.sessions.get(sessionId);
    const traces = this.traces.get(sessionId) || [];

    const agentMap = new Map<string, AgentNode>();
    const connectionMap = new Map<string, AgentConnection>();
    const toolMap = new Map<string, ToolNode>();

    // Build agent nodes from traces
    for (const trace of traces) {
      const agent = this.registry.get(trace.agentId);
      if (agent && !agentMap.has(trace.agentId)) {
        agentMap.set(trace.agentId, {
          id: trace.agentId,
          name: agent.name,
          type: agent.type,
          model: agent.model,
          status: 'completed',
          metrics: {
            invocations: trace.steps.length,
            avgLatencyMs: trace.totalDuration / Math.max(1, trace.steps.length),
            errorRate: trace.steps.filter(s => s.status === 'error').length / Math.max(1, trace.steps.length),
            tokenUsage: trace.steps.reduce((sum, s) => sum + s.tokens.total, 0),
            cost: trace.steps.reduce((sum, s) => sum + s.cost, 0),
            throughput: trace.steps.length / Math.max(1, trace.totalDuration / 1000),
          },
        });
      }

      // Build tool nodes from steps
      for (const step of trace.steps) {
        if (step.type === 'tool-call' && step.output.action) {
          const toolId = step.output.action.target;
          if (!toolMap.has(toolId)) {
            toolMap.set(toolId, {
              id: toolId,
              name: toolId,
              type: 'function',
              invocations: 1,
              successRate: step.status === 'success' ? 1 : 0,
              avgLatencyMs: step.duration,
              usedByAgents: [trace.agentId],
              lastUsed: step.timestamp,
            });
          } else {
            const tool = toolMap.get(toolId)!;
            tool.invocations++;
            tool.avgLatencyMs = (tool.avgLatencyMs + step.duration) / 2;
            if (!tool.usedByAgents.includes(trace.agentId)) {
              tool.usedByAgents.push(trace.agentId);
            }
          }
        }

        // Build connections from agent calls
        if (step.type === 'agent-call' && step.output.action) {
          const targetAgentId = step.output.action.target;
          const connKey = `${trace.agentId}-${targetAgentId}`;
          if (!connectionMap.has(connKey)) {
            connectionMap.set(connKey, {
              id: uuidv4(),
              sourceId: trace.agentId,
              targetId: targetAgentId,
              type: 'delegation',
              messageCount: 1,
              avgLatencyMs: step.duration,
              dataVolume: step.tokens.total,
              errorCount: step.status === 'error' ? 1 : 0,
              lastActivity: step.timestamp,
            });
          } else {
            const conn = connectionMap.get(connKey)!;
            conn.messageCount++;
            conn.avgLatencyMs = (conn.avgLatencyMs + step.duration) / 2;
            conn.dataVolume += step.tokens.total;
            if (step.status === 'error') conn.errorCount++;
          }
        }
      }
    }

    return {
      sessionId,
      timestamp: new Date().toISOString(),
      agents: Array.from(agentMap.values()),
      connections: Array.from(connectionMap.values()),
      tools: Array.from(toolMap.values()),
      layout: {
        type: 'hierarchical',
        width: 1200,
        height: 800,
        nodeSpacing: 100,
      },
      metrics: {
        nodeCount: agentMap.size,
        edgeCount: connectionMap.size,
        avgDegree: connectionMap.size / Math.max(1, agentMap.size),
        maxDepth: 3, // Simplified
        bottlenecks: [],
        criticalPath: Array.from(agentMap.keys()),
      },
    };
  }

  /**
   * Detect anomalies in a session
   */
  detectAnomalies(sessionId: string): AnomalyReport {
    const session = this.sessions.get(sessionId);
    const traces = this.traces.get(sessionId) || [];
    const anomalies: AgentAnomaly[] = [];

    if (!session) {
      return {
        sessionId,
        timestamp: new Date().toISOString(),
        anomalies: [],
        overallRisk: 'low',
        affectedAgents: [],
        recommendations: [],
        autoMitigated: false,
      };
    }

    // Check for infinite loop (repeated similar steps)
    for (const trace of traces) {
      const stepCounts = new Map<string, number>();
      for (const step of trace.steps) {
        const key = `${step.type}-${step.input.content.substring(0, 50)}`;
        stepCounts.set(key, (stepCounts.get(key) || 0) + 1);
      }
      for (const [key, count] of stepCounts) {
        if (count > 5) {
          anomalies.push({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            agentId: trace.agentId,
            type: 'infinite-loop',
            severity: 'high',
            description: `Detected potential infinite loop with ${count} similar operations`,
            evidence: [{ type: 'pattern', description: `${count} repetitions`, timestamp: new Date().toISOString() }],
            suggestedAction: 'Terminate and investigate loop condition',
            autoMitigatable: true,
          });
        }
      }
    }

    // Check for excessive cost
    if (session.metrics.totalCost > 10) {
      anomalies.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        agentId: traces[0]?.agentId || 'unknown',
        type: 'excessive-cost',
        severity: 'medium',
        description: `Session cost ($${session.metrics.totalCost.toFixed(2)}) exceeds threshold`,
        evidence: [{ type: 'metric', description: 'Cost threshold exceeded', value: session.metrics.totalCost, timestamp: new Date().toISOString() }],
        suggestedAction: 'Review and optimize agent usage',
        autoMitigatable: false,
      });
    }

    // Check for high latency
    const avgLatency = session.metrics.totalDurationMs / Math.max(1, session.metrics.totalAgentCalls);
    if (avgLatency > 5000) {
      anomalies.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        agentId: traces[0]?.agentId || 'unknown',
        type: 'high-latency',
        severity: 'medium',
        description: `Average latency (${avgLatency.toFixed(0)}ms) is high`,
        evidence: [{ type: 'metric', description: 'Latency threshold exceeded', value: avgLatency, timestamp: new Date().toISOString() }],
        suggestedAction: 'Optimize agent response times',
        autoMitigatable: false,
      });
    }

    const overallRisk = anomalies.some(a => a.severity === 'critical') ? 'critical' :
                        anomalies.some(a => a.severity === 'high') ? 'high' :
                        anomalies.length > 0 ? 'medium' : 'low';

    return {
      sessionId,
      timestamp: new Date().toISOString(),
      anomalies,
      overallRisk,
      affectedAgents: [...new Set(anomalies.map(a => a.agentId))],
      recommendations: anomalies.map(a => ({
        priority: a.severity === 'critical' ? 'immediate' as const : 'high' as const,
        action: a.suggestedAction,
        description: a.description,
        estimatedImpact: 'Improves system stability',
        automated: a.autoMitigatable,
      })),
      autoMitigated: false,
    };
  }

  /**
   * Get cost attribution for a session
   */
  getCostAttribution(sessionId: string): AgentCostAttribution {
    const session = this.sessions.get(sessionId);
    const traces = this.traces.get(sessionId) || [];

    const agentCosts = new Map<string, { name: string; cost: number; invocations: number; tokens: number }>();
    const modelCosts = new Map<string, { cost: number; tokens: number }>();
    const toolCosts = new Map<string, { name: string; cost: number; invocations: number }>();

    for (const trace of traces) {
      const agent = this.registry.get(trace.agentId);
      for (const step of trace.steps) {
        // Agent costs
        const agentKey = trace.agentId;
        if (!agentCosts.has(agentKey)) {
          agentCosts.set(agentKey, { name: agent?.name || 'Unknown', cost: 0, invocations: 0, tokens: 0 });
        }
        const agentEntry = agentCosts.get(agentKey)!;
        agentEntry.cost += step.cost;
        agentEntry.invocations++;
        agentEntry.tokens += step.tokens.total;

        // Model costs
        const model = agent?.model || 'unknown';
        if (!modelCosts.has(model)) {
          modelCosts.set(model, { cost: 0, tokens: 0 });
        }
        const modelEntry = modelCosts.get(model)!;
        modelEntry.cost += step.cost;
        modelEntry.tokens += step.tokens.total;

        // Tool costs
        if (step.type === 'tool-call' && step.output.action) {
          const toolId = step.output.action.target;
          if (!toolCosts.has(toolId)) {
            toolCosts.set(toolId, { name: toolId, cost: 0, invocations: 0 });
          }
          const toolEntry = toolCosts.get(toolId)!;
          toolEntry.cost += step.cost * 0.1; // Assume 10% of step cost is tool cost
          toolEntry.invocations++;
        }
      }
    }

    const totalCost = session?.metrics.totalCost || 0;

    return {
      sessionId,
      period: { start: session?.startTime || '', end: session?.endTime || new Date().toISOString() },
      totalCost,
      currency: 'USD',
      breakdown: Array.from(agentCosts.entries()).map(([id, data]) => ({
        agentId: id,
        agentName: data.name,
        totalCost: data.cost,
        percentage: totalCost > 0 ? data.cost / totalCost : 0,
        invocations: data.invocations,
        costPerCall: data.invocations > 0 ? data.cost / data.invocations : 0,
        tokenCost: data.cost * 0.8,
        computeCost: data.cost * 0.2,
        trend: 'stable',
      })),
      byModel: Array.from(modelCosts.entries()).map(([model, data]) => ({
        model,
        provider: model.includes('gpt') ? 'OpenAI' : model.includes('claude') ? 'Anthropic' : 'Other',
        totalCost: data.cost,
        percentage: totalCost > 0 ? data.cost / totalCost : 0,
        tokens: data.tokens,
        costPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
      })),
      byTool: Array.from(toolCosts.entries()).map(([id, data]) => ({
        toolId: id,
        toolName: data.name,
        totalCost: data.cost,
        percentage: totalCost > 0 ? data.cost / totalCost : 0,
        invocations: data.invocations,
        costPerCall: data.invocations > 0 ? data.cost / data.invocations : 0,
      })),
      trends: [],
      recommendations: [
        { type: 'optimization', description: 'Consider caching frequent queries', estimatedSavings: totalCost * 0.15, savingsPercentage: 0.15, effort: 'medium', impact: 'medium' },
      ],
    };
  }

  /**
   * Get analytics
   */
  getAnalytics(): MultiAgentAnalytics {
    const sessions = Array.from(this.sessions.values());
    const agents = Array.from(this.registry.values());

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalCost = sessions.reduce((sum, s) => sum + s.metrics.totalCost, 0);
    const totalCalls = sessions.reduce((sum, s) => sum + s.metrics.totalAgentCalls, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.metrics.totalTokens, 0);

    return {
      timestamp: new Date().toISOString(),
      period: { start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() },
      overview: {
        totalSessions,
        totalAgentCalls: totalCalls,
        totalToolCalls: sessions.reduce((sum, s) => sum + s.metrics.totalToolCalls, 0),
        avgSessionDuration: sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.metrics.totalDurationMs, 0) / sessions.length : 0,
        successRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
        totalCost,
        uniqueAgents: agents.length,
        uniqueTools: 0,
      },
      agentPerformance: agents.map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        invocations: agent.metadata.avgLatencyMs ? 100 : 0,
        successRate: agent.metadata.successRate || 0.95,
        avgLatencyMs: agent.metadata.avgLatencyMs || 500,
        p95LatencyMs: (agent.metadata.avgLatencyMs || 500) * 1.5,
        errorRate: 1 - (agent.metadata.successRate || 0.95),
        avgTokens: 1000,
        avgCost: agent.metadata.costPerCall || 0.01,
        trend: { direction: 'stable' as const, magnitude: 0, periodDays: 7, significance: 0.5 },
      })),
      sessionAnalytics: {
        totalSessions,
        avgDuration: sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.metrics.totalDurationMs, 0) / sessions.length : 0,
        avgAgentCalls: sessions.length > 0 ? totalCalls / sessions.length : 0,
        avgToolCalls: 0,
        completionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
        timeoutRate: sessions.filter(s => s.status === 'timeout').length / Math.max(1, totalSessions),
        errorRate: sessions.filter(s => s.status === 'failed').length / Math.max(1, totalSessions),
        distribution: [],
      },
      toolUsage: {
        totalCalls: 0,
        uniqueTools: 0,
        topTools: [],
        errorsByTool: [],
        latencyByTool: [],
      },
      costAnalytics: {
        totalCost,
        costByDay: [],
        costByAgent: [],
        costByModel: [],
        projectedMonthlyCost: totalCost * 30,
      },
      qualityMetrics: {
        overallQuality: 0.92,
        taskCompletionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      },
      trends: {
        sessions: { direction: 'increasing', magnitude: 0.1, periodDays: 7, significance: 0.6 },
        cost: { direction: 'stable', magnitude: 0, periodDays: 7, significance: 0.5 },
        latency: { direction: 'decreasing', magnitude: 0.05, periodDays: 7, significance: 0.7 },
        errors: { direction: 'decreasing', magnitude: 0.02, periodDays: 7, significance: 0.8 },
        quality: { direction: 'stable', magnitude: 0, periodDays: 7, significance: 0.5 },
      },
    };
  }

  private initializeDemoData(): void {
    // Register demo agents
    const demoAgents = [
      { name: 'Orchestrator', type: 'orchestrator' as const, version: '1.0.0', model: 'claude-3-5-sonnet', provider: 'Anthropic', capabilities: [{ name: 'planning', description: 'Plans tasks', enabled: true }], tools: [], status: 'active' as const, metadata: { successRate: 0.98, avgLatencyMs: 450, costPerCall: 0.02 } },
      { name: 'Research Agent', type: 'specialist' as const, version: '1.0.0', model: 'gpt-4-turbo', provider: 'OpenAI', capabilities: [{ name: 'research', description: 'Research tasks', enabled: true }], tools: [], status: 'active' as const, metadata: { successRate: 0.95, avgLatencyMs: 800, costPerCall: 0.03 } },
      { name: 'Code Agent', type: 'worker' as const, version: '1.0.0', model: 'claude-3-5-sonnet', provider: 'Anthropic', capabilities: [{ name: 'coding', description: 'Write code', enabled: true }], tools: [], status: 'active' as const, metadata: { successRate: 0.96, avgLatencyMs: 600, costPerCall: 0.025 } },
      { name: 'Reviewer Agent', type: 'critic' as const, version: '1.0.0', model: 'gpt-4', provider: 'OpenAI', capabilities: [{ name: 'review', description: 'Review outputs', enabled: true }], tools: [], status: 'active' as const, metadata: { successRate: 0.99, avgLatencyMs: 300, costPerCall: 0.015 } },
    ];

    for (const agent of demoAgents) {
      this.registerAgent(agent);
    }
  }
}

// Export singleton instance
export const multiAgentEngine = new MultiAgentEngine();
