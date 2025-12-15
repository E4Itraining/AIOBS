/**
 * AIOBS Storage Connectors Tests
 */
import { describe, it, expect } from '@jest/globals';

describe('VictoriaMetrics Connector', () => {
  describe('Metric Format', () => {
    it('should format metric data points correctly', () => {
      interface MetricDataPoint {
        metric: Record<string, string>;
        value: [number, string];
      }

      const formatMetricPoint = (
        name: string,
        value: number,
        timestamp: number,
        labels: Record<string, string> = {}
      ): MetricDataPoint => {
        return {
          metric: { __name__: name, ...labels },
          value: [timestamp, value.toString()],
        };
      };

      const point = formatMetricPoint('cpu_usage', 0.75, 1700000000, {
        instance: 'server1',
        job: 'aiobs',
      });

      expect(point.metric.__name__).toBe('cpu_usage');
      expect(point.metric.instance).toBe('server1');
      expect(point.value[0]).toBe(1700000000);
      expect(point.value[1]).toBe('0.75');
    });

    it('should format Prometheus line protocol correctly', () => {
      const formatLineProtocol = (
        name: string,
        value: number,
        labels: Record<string, string> = {},
        timestamp?: number
      ): string => {
        const labelPairs = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        const labelStr = labelPairs ? `{${labelPairs}}` : '';
        const tsStr = timestamp ? ` ${timestamp}` : '';

        return `${name}${labelStr} ${value}${tsStr}`;
      };

      expect(formatLineProtocol('test_metric', 42)).toBe('test_metric 42');
      expect(formatLineProtocol('test_metric', 42, { env: 'prod' })).toBe(
        'test_metric{env="prod"} 42'
      );
      expect(
        formatLineProtocol('test_metric', 42, { env: 'prod' }, 1700000000)
      ).toBe('test_metric{env="prod"} 42 1700000000');
    });
  });

  describe('PromQL Query Building', () => {
    it('should build instant queries correctly', () => {
      const buildInstantQuery = (
        metric: string,
        labels: Record<string, string> = {}
      ): string => {
        const labelPairs = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        return labelPairs ? `${metric}{${labelPairs}}` : metric;
      };

      expect(buildInstantQuery('up')).toBe('up');
      expect(buildInstantQuery('up', { job: 'aiobs' })).toBe('up{job="aiobs"}');
      expect(
        buildInstantQuery('http_requests_total', { method: 'GET', status: '200' })
      ).toBe('http_requests_total{method="GET",status="200"}');
    });

    it('should build range queries correctly', () => {
      const buildRangeQuery = (
        metric: string,
        range: string,
        aggregation?: string
      ): string => {
        const baseQuery = `${metric}[${range}]`;
        return aggregation ? `${aggregation}(${baseQuery})` : baseQuery;
      };

      expect(buildRangeQuery('cpu_usage', '5m')).toBe('cpu_usage[5m]');
      expect(buildRangeQuery('cpu_usage', '1h', 'rate')).toBe(
        'rate(cpu_usage[1h])'
      );
      expect(buildRangeQuery('http_requests_total', '5m', 'increase')).toBe(
        'increase(http_requests_total[5m])'
      );
    });

    it('should handle aggregation queries', () => {
      const buildAggregationQuery = (
        aggregator: string,
        metric: string,
        by?: string[]
      ): string => {
        const byClause = by?.length ? ` by (${by.join(',')})` : '';
        return `${aggregator}${byClause}(${metric})`;
      };

      expect(buildAggregationQuery('sum', 'http_requests_total')).toBe(
        'sum(http_requests_total)'
      );
      expect(
        buildAggregationQuery('avg', 'cpu_usage', ['instance', 'job'])
      ).toBe('avg by (instance,job)(cpu_usage)');
    });
  });

  describe('Response Parsing', () => {
    it('should parse instant query response', () => {
      interface InstantQueryResponse {
        status: string;
        data: {
          resultType: string;
          result: Array<{
            metric: Record<string, string>;
            value: [number, string];
          }>;
        };
      }

      const parseInstantResponse = (
        response: InstantQueryResponse
      ): Array<{ metric: string; value: number; labels: Record<string, string> }> => {
        if (response.status !== 'success') {
          throw new Error('Query failed');
        }

        return response.data.result.map((r) => ({
          metric: r.metric.__name__,
          value: parseFloat(r.value[1]),
          labels: Object.fromEntries(
            Object.entries(r.metric).filter(([k]) => k !== '__name__')
          ),
        }));
      };

      const mockResponse: InstantQueryResponse = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: { __name__: 'up', job: 'aiobs', instance: 'localhost:3000' },
              value: [1700000000, '1'],
            },
          ],
        },
      };

      const parsed = parseInstantResponse(mockResponse);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].metric).toBe('up');
      expect(parsed[0].value).toBe(1);
      expect(parsed[0].labels.job).toBe('aiobs');
    });

    it('should parse range query response', () => {
      interface RangeQueryResponse {
        status: string;
        data: {
          resultType: string;
          result: Array<{
            metric: Record<string, string>;
            values: Array<[number, string]>;
          }>;
        };
      }

      const parseRangeResponse = (
        response: RangeQueryResponse
      ): Array<{ metric: string; points: Array<{ ts: number; value: number }> }> => {
        if (response.status !== 'success') {
          throw new Error('Query failed');
        }

        return response.data.result.map((r) => ({
          metric: r.metric.__name__,
          points: r.values.map(([ts, val]) => ({
            ts,
            value: parseFloat(val),
          })),
        }));
      };

      const mockResponse: RangeQueryResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { __name__: 'cpu_usage' },
              values: [
                [1700000000, '0.5'],
                [1700000060, '0.6'],
                [1700000120, '0.55'],
              ],
            },
          ],
        },
      };

      const parsed = parseRangeResponse(mockResponse);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].points).toHaveLength(3);
      expect(parsed[0].points[0].value).toBe(0.5);
    });
  });
});

describe('OpenObserve Connector', () => {
  describe('Log Format', () => {
    it('should format log entries correctly', () => {
      interface LogEntry {
        _timestamp: number;
        level: string;
        message: string;
        service: string;
        [key: string]: unknown;
      }

      const formatLogEntry = (
        level: string,
        message: string,
        service: string,
        metadata: Record<string, unknown> = {}
      ): LogEntry => {
        return {
          _timestamp: Date.now() * 1000, // microseconds
          level,
          message,
          service,
          ...metadata,
        };
      };

      const entry = formatLogEntry('info', 'Server started', 'aiobs-backend', {
        port: 3000,
      });

      expect(entry.level).toBe('info');
      expect(entry.message).toBe('Server started');
      expect(entry.service).toBe('aiobs-backend');
      expect(entry._timestamp).toBeDefined();
    });
  });

  describe('SQL Query Building', () => {
    it('should build basic SELECT queries', () => {
      const buildSelectQuery = (
        stream: string,
        fields: string[],
        limit: number = 100
      ): string => {
        const fieldList = fields.length ? fields.join(', ') : '*';
        return `SELECT ${fieldList} FROM "${stream}" LIMIT ${limit}`;
      };

      expect(buildSelectQuery('logs', ['level', 'message'], 50)).toBe(
        'SELECT level, message FROM "logs" LIMIT 50'
      );
      expect(buildSelectQuery('logs', [])).toBe('SELECT * FROM "logs" LIMIT 100');
    });

    it('should build queries with WHERE clauses', () => {
      const buildFilteredQuery = (
        stream: string,
        filters: Record<string, string>
      ): string => {
        const where = Object.entries(filters)
          .map(([k, v]) => `${k}='${v}'`)
          .join(' AND ');

        return `SELECT * FROM "${stream}" WHERE ${where}`;
      };

      expect(
        buildFilteredQuery('logs', { level: 'error', service: 'aiobs' })
      ).toBe(`SELECT * FROM "logs" WHERE level='error' AND service='aiobs'`);
    });

    it('should build time-bounded queries', () => {
      const buildTimeRangeQuery = (
        stream: string,
        startTime: number,
        endTime: number
      ): string => {
        return `SELECT * FROM "${stream}" WHERE _timestamp >= ${startTime} AND _timestamp <= ${endTime}`;
      };

      const query = buildTimeRangeQuery('logs', 1700000000, 1700003600);
      expect(query).toContain('_timestamp >= 1700000000');
      expect(query).toContain('_timestamp <= 1700003600');
    });
  });
});

describe('Hybrid Backend', () => {
  describe('Data Routing', () => {
    it('should route metrics to VictoriaMetrics', () => {
      type DataType = 'metric' | 'log' | 'trace';
      type Backend = 'victoriametrics' | 'openobserve';

      const getBackendForDataType = (dataType: DataType): Backend => {
        switch (dataType) {
          case 'metric':
            return 'victoriametrics';
          case 'log':
          case 'trace':
            return 'openobserve';
        }
      };

      expect(getBackendForDataType('metric')).toBe('victoriametrics');
      expect(getBackendForDataType('log')).toBe('openobserve');
      expect(getBackendForDataType('trace')).toBe('openobserve');
    });
  });

  describe('Health Check Aggregation', () => {
    it('should aggregate health status from multiple backends', () => {
      type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

      interface BackendHealth {
        backend: string;
        status: HealthStatus;
        latencyMs: number;
      }

      const aggregateHealth = (backends: BackendHealth[]): HealthStatus => {
        const unhealthy = backends.some((b) => b.status === 'unhealthy');
        if (unhealthy) return 'unhealthy';

        const degraded = backends.some((b) => b.status === 'degraded');
        if (degraded) return 'degraded';

        return 'healthy';
      };

      expect(
        aggregateHealth([
          { backend: 'vm', status: 'healthy', latencyMs: 10 },
          { backend: 'oo', status: 'healthy', latencyMs: 15 },
        ])
      ).toBe('healthy');

      expect(
        aggregateHealth([
          { backend: 'vm', status: 'healthy', latencyMs: 10 },
          { backend: 'oo', status: 'degraded', latencyMs: 500 },
        ])
      ).toBe('degraded');

      expect(
        aggregateHealth([
          { backend: 'vm', status: 'unhealthy', latencyMs: 0 },
          { backend: 'oo', status: 'healthy', latencyMs: 15 },
        ])
      ).toBe('unhealthy');
    });
  });
});
