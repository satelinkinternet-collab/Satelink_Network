"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Status dot with pulse
export function StatusDot({ status }: { status:"online"|"offline"|"pending"|"glow" }) {
  const colors = {
    online:  "bg-[#408A71] shadow-[0_0_6px_rgba(64,138,113,0.6)]",
    offline: "bg-[#285A48]",
    pending: "bg-[#a0a030] shadow-[0_0_4px_rgba(160,160,48,0.4)]",
    glow:    "bg-[#00D1FF] shadow-[0_0_8px_rgba(0,209,255,0.7)]",
  };
  return (
    <span className={cn(
      "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
      colors[status],
      status === "online" && "animate-pulse"
    )} />
  );
}

// Metric card (Railway style)
export function MetricCard({
  label, value, sub, glow, trend
}: {
  label: string; value: string; sub?: string;
  glow?: boolean; trend?: string;
}) {
  return (
    <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4
                    hover:border-[#285A48] transition-colors duration-150
                    relative overflow-hidden group">
      {glow && (
        <div className="absolute top-0 right-0 w-16 h-16 rounded-full
                        bg-[#00D1FF] opacity-10 blur-2xl
                        group-hover:opacity-15 transition-opacity" />
      )}
      <p className="text-[10px] text-[#285A48] uppercase tracking-[0.1em] font-semibold">
        {label}
      </p>
      <p className={cn(
        "text-[22px] font-semibold mt-1.5 mb-0.5 font-mono tracking-tight leading-none",
        glow ? "text-[#00D1FF] drop-shadow-[0_0_12px_rgba(0,209,255,0.4)]"
             : "text-[#B0E4CC]"
      )}>
        {value}
      </p>
      {(sub || trend) && (
        <p className="text-[10px] text-[#285A48] flex items-center gap-1">
          {trend && <span className="text-[#408A71]">{trend}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}

// Status badge
export function InfraBadge({
  status
}: { status: "active"|"pending"|"failed"|"paused" }) {
  const styles = {
    active:  "bg-[#0f2e1a] text-[#408A71] border-[#285A48]",
    pending: "bg-[#1a1e0f] text-[#a0a030] border-[#3a3e18]",
    failed:  "bg-[#2e0f0f] text-[#c04040] border-[#3e1818]",
    paused:  "bg-[#1a1a2e] text-[#6060c0] border-[#282840]",
  };
  const labels = {
    active:"● ACTIVE", pending:"○ PENDING", failed:"✕ FAILED", paused:"‖ PAUSED"
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[9px] px-1.5 py-0.5 rounded border",
      "font-semibold tracking-[0.05em] font-sans",
      styles[status]
    )}>
      {labels[status]}
    </span>
  );
}

// Section header
export function SectionHeader({
  title, sub, action
}: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-[15px] font-semibold text-[#B0E4CC] tracking-tight">{title}</h2>
        {sub && <p className="text-[11px] text-[#408A71] mt-0.5">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Terminal block
export function TerminalBlock({ lines }: {
  lines: Array<{ type:"cmd"|"out"|"ok"|"dim"; text:string }>
}) {
  const colors = {
    cmd: "text-[#408A71]",
    out: "text-[#B0E4CC]",
    ok:  "text-[#00D1FF]",
    dim: "text-[#285A48]",
  };
  return (
    <div className="bg-[#060e0b] border border-[#1a3028] rounded-md p-3.5
                    font-mono text-[10px] leading-[1.8]">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-1.5">
          {line.type === "cmd" && <span className="text-[#285A48]">$</span>}
          <span className={colors[line.type]}>{line.text}</span>
        </div>
      ))}
    </div>
  );
}

// Animated counter
export function AnimatedValue({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {value}
    </motion.span>
  );
}

// Card wrapper
export function InfraCard({
  children, className, ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(
      "bg-[#0c1a17] border border-[#1a3028] rounded-md",
      "hover:border-[#285A48] transition-colors duration-150",
      className
    )} {...props}>
      {children}
    </div>
  );
}

// Card header
export function InfraCardHeader({
  title, sub, children
}: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3
                    border-b border-[#1a3028]">
      <div>
        <p className="text-[12px] font-medium text-[#B0E4CC]">{title}</p>
        {sub && <p className="text-[10px] text-[#285A48] mt-0.5">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// Infra table
export function InfraTable({
  headers, rows
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold
                                     text-[#285A48] uppercase tracking-[0.12em]
                                     border-b border-[#1a3028]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#111d16] hover:bg-[#0f1e17]
                                   transition-colors duration-75">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-[11px] text-[#408A71]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Live activity row
export function ActivityRow({
  type, time, message, value
}: {
  type:"revenue"|"epoch"|"node"|"claim"|"error";
  time:string; message:string; value?:string;
}) {
  const dotColors = {
    revenue:"bg-[#00D1FF]", epoch:"bg-[#408A71]",
    node:"bg-[#408A71]", claim:"bg-[#00D1FF]", error:"bg-red-500"
  };
  return (
    <motion.div
      initial={{ opacity:0, x:-4 }}
      animate={{ opacity:1, x:0 }}
      className="flex items-center gap-2 px-4 py-1.5 text-[11px]
                 border-b border-[#111d16] hover:bg-[#0f1e17]
                 transition-colors duration-75"
    >
      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[type])} />
      <span className="text-[#285A48] font-mono text-[10px] min-w-[48px]">{time}</span>
      <span className="text-[#408A71] flex-1">{message}</span>
      {value && <span className="text-[#00D1FF] font-mono text-[10px]">{value}</span>}
    </motion.div>
  );
}

// Epoch countdown
export function EpochCountdown({ seconds }: { seconds: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-[#285A48]">Next epoch</span>
      <motion.span
        key={seconds}
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-mono text-[#00D1FF] tabular-nums"
      >
        {seconds}s
      </motion.span>
    </div>
  );
}

// Skeleton loader
export function InfraSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse bg-[#1a3028] rounded",
      className
    )} />
  );
}
