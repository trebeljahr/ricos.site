// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const layoutCircuit = vi.hoisted(() => vi.fn());
const controlBlockCircuit = vi.hoisted(() => vi.fn());
const datapathCircuit = vi.hoisted(() => vi.fn());

vi.mock("../../lib/computer/circuitLayout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/computer/circuitLayout")>();
  layoutCircuit.mockImplementation(actual.layoutCircuit);
  return { ...actual, layoutCircuit };
});
vi.mock("../../lib/computer/controlUnit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/computer/controlUnit")>();
  controlBlockCircuit.mockImplementation(actual.controlBlockCircuit);
  return { ...actual, controlBlockCircuit };
});
vi.mock("../../lib/computer/datapathBlocks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/computer/datapathBlocks")>();
  datapathCircuit.mockImplementation(actual.datapathCircuit);
  return { ...actual, datapathCircuit };
});

afterEach(cleanup);
beforeEach(() => localStorage.clear());

// Every chapter with a circuit demo loads this module and mounts builders while
// the reader scrolls. Doing this work up front froze the page for three seconds
// and held about 100 MB, for circuits most readers never open.
it("lays out and builds nothing heavy while the module loads", async () => {
  await import("./LogicBuilder");
  expect(layoutCircuit.mock.calls.map(([circuit]) => circuit.name)).toEqual([]);
  // cpuLevels reads its RAM helpers from one empty CPU. The ten presets stay unbuilt.
  expect(controlBlockCircuit.mock.calls.length).toBeLessThan(2);
  expect(datapathCircuit).not.toHaveBeenCalled();
});

it("builds a whole CPU and a block only when the reader places them", async () => {
  const { LogicBuilder } = await import("./LogicBuilder");
  const controlBlocks = controlBlockCircuit.mock.calls.length;
  render(<LogicBuilder embedded storageKey={null} />);
  expect(controlBlockCircuit).toHaveBeenCalledTimes(controlBlocks);
  expect(datapathCircuit).not.toHaveBeenCalled();

  const palette = within(screen.getByRole("complementary", { name: "Gate palette" }));
  fireEvent.click(palette.getByText("Toy CPU (LOOP program)"));
  expect(controlBlockCircuit.mock.calls.length).toBeGreaterThan(controlBlocks);

  layoutCircuit.mockClear();
  fireEvent.click(palette.getAllByRole("button", { name: /ROM/ })[0]);
  expect(datapathCircuit).toHaveBeenCalled();
  expect(layoutCircuit).toHaveBeenCalled();
});
