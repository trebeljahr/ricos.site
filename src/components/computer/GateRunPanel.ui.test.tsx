// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cpuCircuit } from "../../lib/computer/cpuPreset";
import { createNetlistRunner, type NetlistRequest } from "../../lib/computer/netlistRunner";
import { compileProgram, SAMPLE_PROGRAMS } from "../../lib/computerStepper";
import { GateRunPanel, isCpuCircuit } from "./GateRunPanel";

/** Runs the worker protocol in-thread, answering on the next macrotask like a Worker. */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private handle = createNetlistRunner();
  postMessage(request: NetlistRequest) {
    const response = this.handle(request);
    setTimeout(() => this.onmessage?.({ data: response } as MessageEvent), 0);
  }
  terminate() {
    this.onmessage = null;
  }
}

beforeEach(() => vi.stubGlobal("Worker", FakeWorker));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Run as gates", () => {
  const circuit = cpuCircuit(compileProgram(SAMPLE_PROGRAMS.LOOP).bytes);

  it("shows only for a circuit with a control unit", () => {
    expect(isCpuCircuit(circuit)).toBe(true);
    expect(isCpuCircuit({ name: "empty", nodes: [], wires: [] })).toBe(false);
  });

  it("compiles the CPU to gates, runs it to HALT and reads the registers", async () => {
    render(<GateRunPanel circuit={circuit} />);
    const panel = screen.getByRole("region", { name: "Run as gates" });
    fireEvent.click(within(panel).getByLabelText("Run as gates"));
    await screen.findByText(/flip-flops/);
    expect(panel.textContent).toMatch(/[\d,]+ gates/);
    fireEvent.click(within(panel).getByRole("button", { name: "Run" }));
    await screen.findByText(/HALTED/, undefined, { timeout: 5000 });
    const out = within(panel).getByText("OUT").parentElement!;
    expect(out.textContent).toBe("OUT6 0x06");
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Reset" }));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(panel.textContent).toContain("tick 0");
  });
});
