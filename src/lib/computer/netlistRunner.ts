// The message protocol of the gate-netlist worker, kept apart from the worker
// file so tests can drive it without a Worker.
import type { Circuit } from "./logic";
import { compileNetlist, NetlistSim, type NetlistStats, type NetlistSim as Sim } from "./netlist";

export type NetlistRequest =
  /** Compiles `circuit` with every block unfolded. `halt` is the path of a node whose output stops a run. */
  | { type: "load"; circuit: Circuit; halt?: string }
  /** Runs up to `ticks` clock cycles, for at most `budgetMs`, stopping at a halt. */
  | { type: "step"; ticks: number; budgetMs?: number }
  | { type: "reset" }
  | { type: "read" };

export type NetlistResponse =
  | { type: "loaded"; stats: NetlistStats; compileMs: number }
  | {
      type: "state";
      /** Clock cycles since load or reset. */
      tick: number;
      probes: Record<string, number>;
      halted: boolean;
      /** Cycles run by this request and the time they took. */
      ran: number;
      ms: number;
    }
  | { type: "error"; message: string };

export function createNetlistRunner(now: () => number = () => performance.now()) {
  let sim: Sim | undefined;
  let halt = -1;
  let tick = 0;
  const halted = () => halt !== -1 && sim!.bit(halt);
  const state = (ran: number, ms: number): NetlistResponse => ({
    type: "state",
    tick,
    probes: sim!.probes(),
    halted: halted(),
    ran,
    ms,
  });
  return (request: NetlistRequest): NetlistResponse => {
    try {
      if (request.type === "load") {
        const start = now();
        const netlist = compileNetlist(request.circuit);
        sim = new NetlistSim(netlist);
        sim.step(false);
        halt = request.halt ? (netlist.nodes.get(request.halt)?.[0] ?? -1) : -1;
        tick = 0;
        return { type: "loaded", stats: netlist.stats, compileMs: now() - start };
      }
      if (!sim) return { type: "error", message: "No circuit loaded." };
      if (request.type === "reset") {
        sim.reset();
        sim.step(false);
        tick = 0;
        return state(0, 0);
      }
      if (request.type === "read") return state(0, 0);
      const start = now();
      const deadline = start + (request.budgetMs ?? Infinity);
      let ran = 0;
      while (ran < request.ticks && !halted()) {
        sim.tick();
        ran++;
        // Check the clock every 64 cycles; a cycle takes tens of microseconds.
        if ((ran & 63) === 0 && now() >= deadline) break;
      }
      tick += ran;
      return state(ran, now() - start);
    } catch (error) {
      return { type: "error", message: error instanceof Error ? error.message : String(error) };
    }
  };
}
