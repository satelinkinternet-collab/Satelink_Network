import { useState, useEffect } from 'react';
import { DashboardAPI, SystemStatusData, EconomicsData, QueueHealthData, SystemHealthData } from '@/services/api';

export function useDashboardData(pollingIntervalMs = 3000) {
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [economics, setEconomics] = useState<EconomicsData | null>(null);
  const [queueHealth, setQueueHealth] = useState<QueueHealthData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Fetch all data concurrently
        const [sysRes, econRes, queueRes, healthRes] = await Promise.all([
          DashboardAPI.getSystemStatus().catch(e => ({ error: e })),
          DashboardAPI.getEconomics().catch(e => ({ error: e })),
          DashboardAPI.getQueueHealth().catch(e => ({ error: e })),
          DashboardAPI.getSystemHealth().catch(e => ({ error: e }))
        ]);

        if (!isMounted) return;

        // Map successful responses
        if (!sysRes.error) setSystemStatus(sysRes);
        if (!econRes.error) setEconomics(econRes);
        if (!queueRes.error) setQueueHealth(queueRes);
        if (!healthRes.error) setSystemHealth(healthRes);

        setError(null);
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Setup polling
    const intervalId = setInterval(fetchData, pollingIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pollingIntervalMs]);

  return {
    systemStatus,
    economics,
    queueHealth,
    systemHealth,
    isLoading,
    error,
  };
}
