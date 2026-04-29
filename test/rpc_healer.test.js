/**
 * Test: S6-003 Self-healing RPC Failover
 *
 * Verifies RPC provider healing and cascade detection.
 */

import { describe, it, expect } from 'vitest';
import {
  getFallbackChain,
  detectCascadeFailure,
  CASCADE_THRESHOLD,
  FALLBACK_CHAINS
} from '../apps/api/src/autonomous/rpc_healer.js';

describe('S6-003: Self-healing RPC Failover', () => {

  describe('getFallbackChain', () => {
    it('should return fallback for polygon', () => {
      const fallback = getFallbackChain('polygon');
      expect(fallback).toBe('polygon-amoy');
    });

    it('should return fallback for ethereum', () => {
      const fallback = getFallbackChain('ethereum');
      expect(fallback).toBe('arbitrum');
    });

    it('should return null for unknown chain', () => {
      const fallback = getFallbackChain('unknown-chain');
      expect(fallback).toBeNull();
    });
  });

  describe('FALLBACK_CHAINS config', () => {
    it('should have polygon fallbacks', () => {
      expect(FALLBACK_CHAINS.polygon).toContain('polygon-amoy');
    });

    it('should have ethereum fallbacks', () => {
      expect(FALLBACK_CHAINS.ethereum).toContain('arbitrum');
      expect(FALLBACK_CHAINS.ethereum).toContain('base');
    });

    it('should have bidirectional polygon fallbacks', () => {
      expect(FALLBACK_CHAINS['polygon-amoy']).toContain('polygon');
    });
  });

  describe('CASCADE_THRESHOLD', () => {
    it('should be 50%', () => {
      expect(CASCADE_THRESHOLD).toBe(0.5);
    });
  });
});
