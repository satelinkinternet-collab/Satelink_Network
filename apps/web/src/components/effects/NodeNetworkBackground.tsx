"use client";
import { useEffect, useRef } from "react";

interface Node {
  x: number; y: number; z: number;
  vx: number; vy: number; r: number;
  pulse: number; type: "active" | "passive"; alpha: number;
}

interface Packet {
  from: Node; to: Node; t: number; speed: number;
}

export function NodeNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d")!;
    let animId: number;
    let W = 0, H = 0;
    let nodes: Node[] = [];
    let packets: Packet[] = [];

    const COLORS = {
      dark: "#272829",
      midA: (a: number) => `rgba(97,103,122,${a})`,
      lightA: (a: number) => `rgba(216,217,218,${a})`,
      creamA: (a: number) => `rgba(255,246,224,${a})`,
    };

    function resize() {
      W = canvasEl!.width = canvasEl!.offsetWidth;
      H = canvasEl!.height = canvasEl!.offsetHeight;
      initNodes();
    }

    function initNodes() {
      nodes = Array.from({ length: 70 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 2 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2.5 + 0.5,
        pulse: Math.random() * Math.PI * 2,
        type: Math.random() < 0.15 ? "active" : "passive",
        alpha: Math.random() * 0.5 + 0.3,
      }));
    }

    function draw() {
      ctx.fillStyle = COLORS.dark;
      ctx.fillRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = COLORS.midA(0.06);
      ctx.lineWidth = 1;
      const gs = 80;
      for (let x = 0; x < W; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const a = (1 - dist / 140) * 0.18;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = COLORS.midA(a);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // data packets
      if (Math.random() < 0.04) {
        const active = nodes.filter((n) => n.type === "active");
        if (active.length >= 2) {
          const a = active[Math.floor(Math.random() * active.length)];
          const b = active[Math.floor(Math.random() * active.length)];
          if (a !== b) packets.push({ from: a, to: b, t: 0, speed: 0.008 + Math.random() * 0.012 });
        }
      }
      packets = packets.filter((p) => {
        p.t += p.speed;
        if (p.t >= 1) return false;
        const x = p.from.x + (p.to.x - p.from.x) * p.t;
        const y = p.from.y + (p.to.y - p.from.y) * p.t;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.creamA(0.9); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.creamA(0.2); ctx.fill();
        return true;
      });

      // nodes
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;

        const p = Math.sin(n.pulse) * 0.5 + 0.5;
        const r = n.r * n.z * (1 + p * 0.4);
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (n.type === "active") {
          ctx.fillStyle = COLORS.creamA(n.alpha * (0.6 + p * 0.4));
          ctx.fill();
          ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = COLORS.creamA(0.15 * p);
          ctx.lineWidth = 0.5; ctx.stroke();
        } else {
          ctx.fillStyle = COLORS.lightA(n.alpha * 0.4);
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}
