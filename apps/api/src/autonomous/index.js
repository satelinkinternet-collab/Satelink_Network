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
export {
  startRpcHealer,
  getHealerStats,
  runHealingCycle,
  detectCascadeFailure,
  tryFallbackRoute
} from './rpc_healer.js'
export {
  startRevenueMonitor,
  getAnomalyStats,
  detectAnomalies,
  getRevenueVelocity
} from './revenue_anomaly.js'
export {
  startTreasuryMonitor,
  checkTreasury,
  getTreasuryStatus
} from './treasury_monitor.js'
export {
  startCapacityAlerter,
  getCapacityStats
} from './capacity_alerter.js'
