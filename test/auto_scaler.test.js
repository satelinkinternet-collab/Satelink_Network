/**
 * Test: S6-002 Auto-scaling Node Selection
 *
 * Verifies dynamic weight calculation and node selection based on load.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDynamicWeight,
  DEFAULT_CAPACITY,
  OVERLOAD_THRESHOLD,
  UNDERLOAD_THRESHOLD
} from '../apps/api/src/autonomous/auto_scaler.js';

describe('S6-002: Auto-scaling Node Selection', () => {

  describe('calculateDynamicWeight', () => {
    const baseWeight = 50;
    const capacity = 1000;

    it('should reduce weight for overloaded nodes (>80% utilization)', () => {
      const load = capacity * 0.9; // 90% utilization
      const weight = calculateDynamicWeight(baseWeight, load, capacity);
      expect(weight).toBeLessThan(baseWeight * 0.3);
    });

    it('should boost weight for underloaded nodes (<30% utilization)', () => {
      const load = capacity * 0.1; // 10% utilization
      const weight = calculateDynamicWeight(baseWeight, load, capacity);
      expect(weight).toBeGreaterThan(baseWeight);
    });

    it('should scale weight proportionally for balanced nodes', () => {
      const load = capacity * 0.5; // 50% utilization
      const weight = calculateDynamicWeight(baseWeight, load, capacity);
      expect(weight).toBeLessThan(baseWeight);
      expect(weight).toBeGreaterThan(baseWeight * 0.2);
    });

    it('should never return zero weight', () => {
      const load = capacity * 2; // 200% overload
      const weight = calculateDynamicWeight(baseWeight, load, capacity);
      expect(weight).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero load', () => {
      const weight = calculateDynamicWeight(baseWeight, 0, capacity);
      expect(weight).toBeGreaterThan(baseWeight);
    });
  });

  describe('threshold constants', () => {
    it('should have correct overload threshold', () => {
      expect(OVERLOAD_THRESHOLD).toBe(0.8);
    });

    it('should have correct underload threshold', () => {
      expect(UNDERLOAD_THRESHOLD).toBe(0.3);
    });

    it('should have default capacity', () => {
      expect(DEFAULT_CAPACITY).toBe(1000);
    });
  });
});
