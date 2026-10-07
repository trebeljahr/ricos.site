/**
 * Values on 8-lane bus wires. Plain wires stay booleans; only bus wires carry
 * one of these, so the four-valued logic costs nothing elsewhere.
 *
 * - a number 0–255: the 8 lanes, bit 0 least significant
 * - "Z": floating, nobody drives the net
 * - "X": conflict, two or more enabled drivers disagree
 */
export type BusValue = number | "Z" | "X";
export const BUS_WIDTH = 8;

/** Resolves every driver on one bus net, as an HDL resolves a `wire`. */
export function resolveBus(drivers: BusValue[]): BusValue {
  let value: BusValue = "Z";
  for (const driver of drivers) {
    if (driver === "Z") continue;
    if (driver === "X") return "X";
    if (value === "Z") value = driver;
    else if (value !== driver) return "X";
  }
  return value;
}

export const busFromBits = (bits: boolean[]): number =>
  bits.reduce((value, bit, index) => (bit ? value | (1 << index) : value), 0);

/** A floating or conflicting bus reads as all zeros once split into plain wires. */
export const bitsFromBus = (value: BusValue): boolean[] =>
  Array.from({ length: BUS_WIDTH }, (_, bit) => typeof value === "number" && Boolean((value >> bit) & 1));

export const formatBus = (value: BusValue | undefined) =>
  value === undefined || value === "Z"
    ? "Z"
    : value === "X"
      ? "X"
      : `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
