/**
 * Test: S6-005 Treasury Auto-refill Monitor
 *
 * Verifies treasury threshold detection.
 */

import { describe, it, expect } from 'vitest';
import {
  checkThresholds,
  MATIC_LOW_THRESHOLD,
  USDT_LOW_THRESHOLD,
  MATIC_CRITICAL_THRESHOLD,
  USDT_CRITICAL_THRESHOLD
} from '../apps/api/src/autonomous/treasury_monitor.js';

describe('S6-005: Treasury Auto-refill Monitor', () => {

  describe('threshold constants', () => {
    it('should have MATIC low threshold of 1', () => {
      expect(MATIC_LOW_THRESHOLD).toBe(1);
    });

    it('should have USDT low threshold of 100', () => {
      expect(USDT_LOW_THRESHOLD).toBe(100);
    });

    it('should have MATIC critical threshold of 0.1', () => {
      expect(MATIC_CRITICAL_THRESHOLD).toBe(0.1);
    });

    it('should have USDT critical threshold of 10', () => {
      expect(USDT_CRITICAL_THRESHOLD).toBe(10);
    });
  });

  describe('checkThresholds', () => {
    it('should return no alerts for healthy balances', () => {
      const alerts = checkThresholds(10, 500);
      expect(alerts).toHaveLength(0);
    });

    it('should alert on low MATIC', () => {
      const alerts = checkThresholds(0.5, 500);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('MATIC_LOW');
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('should alert critical on very low MATIC', () => {
      const alerts = checkThresholds(0.05, 500);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('MATIC_CRITICAL');
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('should alert on low USDT', () => {
      const alerts = checkThresholds(10, 50);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('USDT_LOW');
    });

    it('should alert critical on very low USDT', () => {
      const alerts = checkThresholds(10, 5);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('USDT_CRITICAL');
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('should return multiple alerts for both low', () => {
      const alerts = checkThresholds(0.5, 50);
      expect(alerts).toHaveLength(2);
    });

    it('should handle null balances gracefully', () => {
      const alerts = checkThresholds(null, null);
      expect(alerts).toHaveLength(0);
    });
  });
});
