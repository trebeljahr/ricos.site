// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRESETS, type Circuit } from "../../lib/computer/logic";
import { builtinCircuit, verifyCircuitIdentity } from "../../lib/computer/recognition";
import { GateSymbol } from "./GateSymbol";
import { RecognitionPanel } from "./RecognitionPanel";
import { LogicBuilder } from "./LogicBuilder";
afterEach(cleanup);
const half = PRESETS["Half adder"];
describe("recognition interface", () => {
  it("requires explicit public outputs, shows ordering, and commits only a chosen verified match", async () => {
    const apply = vi.fn();
    render(
      <RecognitionPanel
        circuit={half}
        selection={[]}
        wireSelection={[]}
        onClose={() => {}}
        onVerified={apply}
      />,
    );
    expect(
      (screen.getByRole("checkbox", { name: "Public output SUM" }) as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Check behavior" }));
    expect(await screen.findByText(/Mark at least one/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Compare component"), {
      target: { value: "half-adder" },
    });
    fireEvent.click(screen.getByLabelText("Public output CARRY"));
    fireEvent.click(screen.getByLabelText("Public output SUM"));
    fireEvent.click(screen.getByRole("button", { name: "Check behavior" }));
    expect(await screen.findByText(/expected .*got/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Move sum earlier" }));
    fireEvent.click(screen.getByRole("button", { name: "Check behavior" }));
    expect(await screen.findByText(/Equivalent on all 4/)).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use this verified identity" }));
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({
        ports: { inputs: ["a", "b"], outputs: ["sum", "carry"] },
        identity: expect.objectContaining({ componentId: "half-adder" }),
      }),
      false,
    );
  });
  it("saves a selected construction without boundary wires or changing the source", async () => {
    const apply = vi.fn();
    render(
      <RecognitionPanel
        circuit={half}
        selection={half.nodes.map((n) => n.id)}
        wireSelection={[]}
        onClose={() => {}}
        onVerified={apply}
      />,
    );
    fireEvent.click(screen.getByLabelText("Public output SUM"));
    fireEvent.click(screen.getByLabelText("Public output CARRY"));
    fireEvent.click(screen.getByRole("button", { name: "Check behavior" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save verified construction" }));
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ identity: expect.objectContaining({ ownership: "user" }) }),
      true,
    );
    expect(half.identity).toBeUndefined();
  });
  it("uses identical symbol geometry for built-in and verified user identities and ignores names", () => {
    const ports = { inputs: ["a", "b"], outputs: ["sum", "carry"] };
    const own = verifyCircuitIdentity(half, ports, "half-adder")!;
    const builtin = builtinCircuit("half-adder", half);
    const { container, rerender } = render(
      <>
        <GateSymbol type="module" circuit={own} />
        <GateSymbol type="module" circuit={builtin} />
      </>,
    );
    const symbols = container.querySelectorAll("svg");
    expect(symbols[0].innerHTML).toBe(symbols[1].innerHTML);
    expect(screen.getByRole("img", { name: /Yours/ })).toBeTruthy();
    rerender(<GateSymbol type="module" circuit={{ ...own, name: "Totally different" }} />);
    expect(screen.getByRole("img", { name: /Yours/ }).getAttribute("data-symbol")).toBe("adder");
    const fake: Circuit = { ...half, name: "AND" };
    rerender(<GateSymbol type="module" circuit={fake} />);
    expect(container.querySelector("[data-symbol]")!.getAttribute("data-symbol")).toBe("module");
  });
  it("opens from the builder and retains verification through save and boxing", async () => {
    localStorage.clear();
    Element.prototype.setPointerCapture = () => {};
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Recognize circuit" }));
    const panel = screen.getByRole("dialog");
    fireEvent.click(within(panel).getByLabelText("Public output SUM"));
    fireEvent.click(within(panel).getByLabelText("Public output CARRY"));
    fireEvent.click(within(panel).getByRole("button", { name: "Check behavior" }));
    fireEvent.click(
      await within(panel).findByRole("button", { name: "Use this verified identity" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Save circuit" }),
    );
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByTitle("Add Half adder to canvas"),
    );
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    expect(within(board).getByRole("img", { name: /Yours/ })).toBeTruthy();
  });
});
