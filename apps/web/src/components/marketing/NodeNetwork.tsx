"use client";

import { useMemo } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
}

interface Connection {
  from: Node;
  to: Node;
  delay: number;
}

interface NodeNetworkProps {
  nodeCount?: number;
  animated?: boolean;
  className?: string;
}

export function NodeNetwork({ nodeCount = 15, animated = true, className = "" }: NodeNetworkProps) {
  const { nodes, connections } = useMemo(() => {
    const generatedNodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      generatedNodes.push({
        id: i,
        x: 50 + Math.random() * 1100,
        y: 30 + Math.random() * 540,
      });
    }

    const generatedConnections: Connection[] = [];

    for (let i = 0; i < generatedNodes.length; i++) {
      for (let j = i + 1; j < generatedNodes.length; j++) {
        const dx = generatedNodes[i].x - generatedNodes[j].x;
        const dy = generatedNodes[i].y - generatedNodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 250 && generatedConnections.length < 25) {
          generatedConnections.push({
            from: generatedNodes[i],
            to: generatedNodes[j],
            delay: Math.random() * 5,
          });
        }
      }
    }

    return { nodes: generatedNodes, connections: generatedConnections };
  }, [nodeCount]);

  return (
    <svg
      className={`node-network ${className}`}
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.4,
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient id="packetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#CBE4DE" stopOpacity="0" />
          <stop offset="50%" stopColor="#CBE4DE" stopOpacity="1" />
          <stop offset="100%" stopColor="#CBE4DE" stopOpacity="0" />
        </linearGradient>
      </defs>

      {connections.map((conn, i) => (
        <g key={`conn-${i}`}>
          <line
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            stroke="#0E8388"
            strokeWidth="0.5"
            opacity="0.3"
          />

          {animated && (
            <circle r="3" fill="#CBE4DE" opacity="0.8">
              <animateMotion
                dur={`${2 + conn.delay}s`}
                repeatCount="indefinite"
                path={`M${conn.from.x},${conn.from.y} L${conn.to.x},${conn.to.y}`}
                begin={`${conn.delay}s`}
              />
              <animate
                attributeName="opacity"
                values="0;0.8;0.8;0"
                dur={`${2 + conn.delay}s`}
                repeatCount="indefinite"
                begin={`${conn.delay}s`}
              />
            </circle>
          )}
        </g>
      ))}

      {nodes.map((node) => (
        <g key={`node-${node.id}`}>
          <circle
            cx={node.x}
            cy={node.y}
            r="4"
            fill="#0E8388"
            opacity="0.6"
          >
            {animated && (
              <animate
                attributeName="opacity"
                values="0.3;0.8;0.3"
                dur={`${2 + (node.id % 3)}s`}
                repeatCount="indefinite"
                begin={`${(node.id * 0.2) % 2}s`}
              />
            )}
          </circle>
          <circle
            cx={node.x}
            cy={node.y}
            r="8"
            fill="none"
            stroke="#0E8388"
            strokeWidth="0.5"
            opacity="0.2"
          >
            {animated && (
              <animate
                attributeName="r"
                values="4;12;4"
                dur={`${3 + (node.id % 2)}s`}
                repeatCount="indefinite"
                begin={`${(node.id * 0.3) % 3}s`}
              />
            )}
          </circle>
        </g>
      ))}

      <style>{`
        .node-network {
          overflow: visible;
        }
      `}</style>
    </svg>
  );
}
