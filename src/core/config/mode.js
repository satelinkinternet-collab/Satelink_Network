export function getMode() {
  return process.env.SATELINK_MODE || "simulation";
}

export function isSimulation() {
  return getMode() === "simulation";
}

export function isLive() {
  return getMode() === "live";
}
