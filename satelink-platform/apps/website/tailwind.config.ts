import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        "deep-panel": "#06122e",
        "panel-border": "#0ea5e9",
        "neon-blue": "#00d9ff",
        "neon-cyan": "#22d3ee",
        "telemetry-orange": "#ff7a00",
        "telemetry-red": "#ff2d55",
      },
      fontFamily: {
        inter: ["var(--font-inter)"],
        orbitron: ["var(--font-orbitron)"],
        mono: ["var(--font-jetbrains-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
