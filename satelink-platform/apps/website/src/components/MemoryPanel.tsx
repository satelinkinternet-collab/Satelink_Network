'use client';
import SystemPanel from './SystemPanel';
import StatBox from './StatBox';

interface MemoryPanelProps {
    freeMem?: string;
    usedMem?: string;
    dlSpeed?: string;
    ulSpeed?: string;
}

export default function MemoryPanel({
    freeMem = '32.4 GB',
    usedMem = '18.1 GB',
    dlSpeed = '1.2 Gbps',
    ulSpeed = '850 Mbps'
}: MemoryPanelProps) {
    return (
        <SystemPanel title="SYS_MEMORY & BANDWIDTH" glowColor="cyan">
            <div className="grid grid-cols-2 gap-4">
                <StatBox label="FREE MEMORY" value={freeMem} color="cyan" />
                <StatBox label="USED MEMORY" value={usedMem} color="red" />
                <StatBox label="DOWNLINK" value={dlSpeed} color="blue" />
                <StatBox label="UPLINK" value={ulSpeed} color="blue" />
            </div>
        </SystemPanel>
    );
}
