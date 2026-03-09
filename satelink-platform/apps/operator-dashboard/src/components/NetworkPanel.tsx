'use client';
import SystemPanel from './SystemPanel';
import StatBox from './StatBox';

interface NetworkPanelProps {
    nodes?: number;
    ops?: string;
    latency?: string;
    throughput?: string;
}

export default function NetworkPanel({
    nodes = 12450,
    ops = '1.4M',
    latency = '12ms',
    throughput = '48.2 Tbps'
}: NetworkPanelProps) {
    return (
        <SystemPanel title="NETWORK_TELEMETRY" glowColor="blue">
            <div className="grid grid-cols-2 gap-4">
                <StatBox label="NODES ONLINE" value={nodes.toLocaleString()} color="cyan" />
                <StatBox label="OPERATIONS/SEC" value={ops} color="blue" />
                <StatBox label="AVG LATENCY" value={latency} color="cyan" />
                <StatBox label="THROUGHPUT" value={throughput} color="blue" />
            </div>
        </SystemPanel>
    );
}
