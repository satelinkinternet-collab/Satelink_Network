/**
 * Autonomous Operations Module
 * S6: Self-healing, auto-scaling, and anomaly detection
 */

export { startSentinel } from './sentinel.js'
export {
  startAutoScaler,
  selectNode,
  getActiveNodes,
  getScalingStats,
  incrementNodeLoad,
  updateNodeWeights
} from './auto_scaler.js'
