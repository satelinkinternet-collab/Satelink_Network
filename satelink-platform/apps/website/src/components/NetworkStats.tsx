import StatBox from '@/components/StatBox';

export default function NetworkStats() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <StatBox label="NODES_ONLINE" value="1,842" color="cyan" />
            <StatBox label="OPS_PER_DAY" value="52.4M" color="blue" />
            <StatBox label="GLOBAL_LATENCY" value="42ms" color="orange" />
            <StatBox label="ACTIVE_REGIONS" value="24" color="cyan" />
        </div>
    );
}
