"use client";
import { useEffect, useRef } from "react";

export function GlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let W = 0, H = 0, rot = 0;

    type Star = { x: number; y: number; r: number; a: number; twinkle: number; speed: number };
    type GNode = { lat: number; lng: number; label: string };

    let stars: Star[] = [];
    const gNodes: GNode[] = [
      { lat: 13, lng: 80, label: "AP-S" },
      { lat: 37, lng: 127, label: "AP-N" },
      { lat: 51, lng: -0.1, label: "EU-W" },
      { lat: 40, lng: 28, label: "EU-E" },
      { lat: 37, lng: -122, label: "US-W" },
      { lat: 40, lng: -74, label: "US-E" },
      { lat: -23, lng: -46, label: "SA" },
      { lat: 1, lng: 103, label: "SEA" },
      { lat: 25, lng: 55, label: "ME" },
      { lat: -33, lng: 18, label: "AF" },
    ];
    const dotGrid: { lat: number; lng: number }[] = [];
    for (let lat = -80; lat <= 80; lat += 12)
      for (let lng = -180; lng < 180; lng += 12)
        dotGrid.push({ lat, lng });

    const R = () => Math.min(W, H) * 0.30;

    function latLng(lat: number, lng: number, r: number) {
      const phi = (90 - lat) * Math.PI / 180, theta = (lng + 180) * Math.PI / 180;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const rx = x * cosR - z * sinR, rz = x * sinR + z * cosR;
      return { x: W / 2 + rx, y: H / 2 - y, z: rz, visible: rz > -r * 0.1 };
    }

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      stars = Array.from({ length: 200 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2,
        a: Math.random() * 0.5 + 0.1,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.008 + 0.003
      }));
    }

    function draw() {
      ctx.fillStyle = "#091413";
      ctx.fillRect(0, 0, W, H);

      // stars
      stars.forEach(s => {
        s.twinkle += s.speed;
        const a = s.a * (0.5 + Math.sin(s.twinkle) * 0.5);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(176,228,204,${a})`;
        ctx.fill();
      });

      const r = R();

      // glow backdrop
      const gr = ctx.createRadialGradient(W / 2, H / 2, r * 0.6, W / 2, H / 2, r * 1.4);
      gr.addColorStop(0, "rgba(0,209,255,0.04)");
      gr.addColorStop(0.5, "rgba(64,138,113,0.04)");
      gr.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();

      // globe fill
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      const gf = ctx.createRadialGradient(W / 2 - r * 0.2, H / 2 - r * 0.2, 0, W / 2, H / 2, r);
      gf.addColorStop(0, "rgba(64,138,113,0.10)");
      gf.addColorStop(1, "rgba(9,20,19,0.85)");
      ctx.fillStyle = gf;
      ctx.fill();
      ctx.strokeStyle = "rgba(64,138,113,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // dot grid
      dotGrid.forEach(d => {
        const p = latLng(d.lat, d.lng, r);
        if (!p.visible) return;
        const alpha = Math.min(1, (p.z / r) * 1.8) * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(64,138,113,${alpha})`;
        ctx.fill();
      });

      // lat/lng lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 4) {
          const p = latLng(lat, lng, r);
          if (p.visible) {
            if (first) { ctx.moveTo(p.x, p.y); first = false; }
            else ctx.lineTo(p.x, p.y);
          } else first = true;
        }
        ctx.strokeStyle = "rgba(64,138,113,0.12)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 4) {
          const p = latLng(lat, lng, r);
          if (p.visible) {
            if (first) { ctx.moveTo(p.x, p.y); first = false; }
            else ctx.lineTo(p.x, p.y);
          } else first = true;
        }
        ctx.strokeStyle = "rgba(64,138,113,0.10)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // network nodes on globe
      const t = Date.now();
      gNodes.forEach((n, i) => {
        const p = latLng(n.lat, n.lng, r);
        if (!p.visible) return;
        const bright = Math.max(0, (p.z / r));
        const pulse = Math.sin(t * 0.002 + i * 0.7) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 + pulse * 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,209,255,${0.12 * bright * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,209,255,${0.85 * bright})`;
        ctx.fill();
        ctx.fillStyle = `rgba(176,228,204,${0.55 * bright})`;
        ctx.font = `${Math.floor(7 + bright * 4)}px monospace`;
        ctx.fillText(n.label, p.x + 6, p.y - 4);
      });

      // connection arcs
      const vis = gNodes.map(n => ({ ...n, ...latLng(n.lat, n.lng, r) }))
        .filter(n => n.visible);
      for (let i = 0; i < vis.length - 1; i += 3) {
        const a = vis[i], b = vis[(i + 2) % vis.length];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.35;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = "rgba(0,209,255,0.07)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      rot += 0.0008;
      animId = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
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
