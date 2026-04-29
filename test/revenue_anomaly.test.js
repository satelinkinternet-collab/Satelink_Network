/**
 * Test: S6-004 Revenue Anomaly Detection
 *
 * Verifies anomaly detection thresholds and constants.
 */

import { describe, it, expect } from 'vitest';
import {
  DROP_THRESHOLD,
  SPIKE_THRESHOLD,
  DEAD_INTERVAL_MINUTES,
  ROLLING_WINDOW_HOURS
} from '../apps/api/src/autonomous/revenue_anomaly.js';

describe('S6-004: Revenue Anomaly Detection', () => {

  describe('threshold constants', () => {
    it('should alert on >50% drop', () => {
      expect(DROP_THRESHOLD).toBe(0.5);
    });

    it('should alert on >300% spike', () => {
      expect(SPIKE_THRESHOLD).toBe(3.0);
    });

    it('should alert after 30min dead interval', () => {
      expect(DEAD_INTERVAL_MINUTES).toBe(30);
    });

    it('should use 24h rolling window', () => {
      expect(ROLLING_WINDOW_HOURS).toBe(24);
    });
  });

  describe('threshold logic', () => {
    it('DROP_THRESHOLD should trigger when current < average * threshold', () => {
      const avgHourly = 100;
      const current = 40;
      const isDropAnomaly = current < avgHourly * DROP_THRESHOLD;
      expect(isDropAnomaly).toBe(true);
    });

    it('SPIKE_THRESHOLD should trigger when current > average * threshold', () => {
      const avgHourly = 100;
      const current = 400;
      const isSpikeAnomaly = current > avgHourly * SPIKE_THRESHOLD;
      expect(isSpikeAnomaly).toBe(true);
    });

    it('normal revenue should not trigger anomaly', () => {
      const avgHourly = 100;
      const current = 100;
      const isDropAnomaly = current < avgHourly * DROP_THRESHOLD;
      const isSpikeAnomaly = current > avgHourly * SPIKE_THRESHOLD;
      expect(isDropAnomaly).toBe(false);
      expect(isSpikeAnomaly).toBe(false);
    });
  });
});
