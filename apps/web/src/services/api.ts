import api from '../lib/api';

export interface SystemStatusData {
  revenue: number;
  jobsPerSec: number;
  activeWorkers: number;
  queueDepth: number;
  [key: string]: any;
}

export interface EconomicsData {
  revenueGraph: { time: string; amount: number }[];
  lastEpochRevenue: number;
  distribution: {
    nodeEarnings: number;
    burned: number;
    treasury: number;
  };
  totalNodeEarnings: number;
  [key: string]: any;
}

export interface QueueHealthData {
  depthPerPriority: {
    high: number;
    normal: number;
    low: number;
  };
  dlqSize: number;
  throughput: number;
  [key: string]: any;
}

export interface SystemHealthData {
  dbStatus: 'online' | 'offline' | 'degraded';
  redisStatus: 'online' | 'offline' | 'degraded';
  apiLatencyMs: number;
  [key: string]: any;
}

/**
 * Single source of truth for dashboard API calls.
 */
export const DashboardAPI = {
  getSystemStatus: async (): Promise<any> => {
    try {
      const res = await api.get('/system/status');
      return res.data;
    } catch (error) {
      console.error('API Error: /system/status', error);
      throw error;
    }
  },
  getEconomics: async (): Promise<any> => {
    try {
      const res = await api.get('/admin-api/economics');
      return res.data;
    } catch (error) {
      console.error('API Error: /admin-api/economics', error);
      throw error;
    }
  },
  getQueueHealth: async (): Promise<any> => {
    try {
      const res = await api.get('/health/queue');
      return res.data;
    } catch (error) {
      console.error('API Error: /health/queue', error);
      throw error;
    }
  },
  getSystemHealth: async (): Promise<any> => {
    try {
      const res = await api.get('/health');
      return res.data;
    } catch (error) {
      console.error('API Error: /health', error);
      throw error;
    }
  }
};
