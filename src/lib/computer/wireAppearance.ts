import type { Snapshot } from "./logic";

export const SIGNAL_COLORS = {
  high: "#ffe078",
  low: "#bc6464",
  floating: "#7d8a92",
  conflict: "#ff5a52",
} as const;

export function wireSignal(snapshot: Snapshot, from: string, output = 0, width: 1 | 8 = 1): keyof typeof SIGNAL_COLORS {
  if (width === 8) {
    const value = snapshot.buses?.[from] ?? "Z";
    return value === "Z" ? "floating" : value === "X" ? "conflict" : value > 0 ? "high" : "low";
  }
  return (snapshot.outputs[from]?.[output] ?? snapshot.values[from]) ? "high" : "low";
}
