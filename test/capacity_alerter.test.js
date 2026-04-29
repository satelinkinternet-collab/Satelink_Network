/**
 * Test: S6-006 Capacity Alerting
 *
 * Verifies capacity threshold detection.
 */

import { describe, it, expect } from 'vitest';
import {
  checkCapacityAlerts,
  THRESHOLDS
} from '../apps/api/src/autonomous/capacity_alerter.js';

describe('S6-006: Capacity Alerting', () => {

  describe('THRESHOLDS', () => {
    it('should have node utilization threshold', () => {
      expect(THRESHOLDS.nodeUtilization).toBe(0.85);
    });

    it('should have DB connections threshold', () => {
      expect(THRESHOLDS.dbConnections).toBe(0.9);
    });

    it('should have Redis memory threshold', () => {
      expect(THRESHOLDS.redisMemory).toBe(0.8);
    });

    it('should have queue depth threshold', () => {
      expect(THRESHOLDS.queueDepth).toBe(1000);
    });
  });

  describe('checkCapacityAlerts', () => {
    it('should return no alerts for healthy stats', () => {
      const stats = {
        nodes: { activeNodes: 5, totalNodes: 5 },
        dbPool: { totalCount: 10, idleCount: 5, waitingCount: 0 },
        redis: { utilizationPct: '50.0' },
        queue: { queueDepth: 100 }
      };
      const alerts = checkCapacityAlerts(stats);
      expect(alerts).toHaveLength(0);
    });

    it('should alert on DB pool contention', () => {
      const stats = {
        nodes: { activeNodes: 5, totalNodes: 5 },
        dbPool: { totalCount: 10, idleCount: 0, waitingCount: 5 },
        redis: { utilizationPct: '50.0' },
        queue: { queueDepth: 100 }
      };
      const alerts = checkCapacityAlerts(stats);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('DB_POOL_CONTENTION');
    });

    it('should alert on high Redis memory', () => {
      const stats = {
        nodes: { activeNodes: 5, totalNodes: 5 },
        dbPool: { totalCount: 10, idleCount: 5, waitingCount: 0 },
        redis: { utilizationPct: '85.0' },
        queue: { queueDepth: 100 }
      };
      const alerts = checkCapacityAlerts(stats);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('REDIS_MEMORY_HIGH');
    });

    it('should alert on queue backlog', () => {
      const stats = {
        nodes: { activeNodes: 5, totalNodes: 5 },
        dbPool: { totalCount: 10, idleCount: 5, waitingCount: 0 },
        redis: { utilizationPct: '50.0' },
        queue: { queueDepth: 2000 }
      };
      const alerts = checkCapacityAlerts(stats);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('QUEUE_BACKLOG');
    });

    it('should alert critical when no active nodes', () => {
      const stats = {
        nodes: { activeNodes: 0, totalNodes: 5 },
        dbPool: { totalCount: 10, idleCount: 5, waitingCount: 0 },
        redis: { utilizationPct: '50.0' },
        queue: { queueDepth: 100 }
      };
      const alerts = checkCapacityAlerts(stats);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('NO_ACTIVE_NODES');
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('should return multiple alerts', () => {
      const stats = {
        nodes: { activeNodes: 0, totalNodes: 5 },
        dbPool: { totalCount: 10, idleCount: 0, waitingCount: 3 },
        redis: { utilizationPct: '50.0' },
        queue: { queueDepth: 100 }
      };
      const alerts = checkCapacityAlerts(stats);
      expect(alerts).toHaveLength(2);
    });
  });
});
