// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

afterEach(cleanup);

it("reports the entire tutorial board while editing inside an added module", () => {
  const inner: Circuit = {
    name: "Inner",
    nodes: [{ id: "a", type: "switch", x: 0, y: 0 }],
    wires: [],
  };
  const root: Circuit = {
    name: "Root",
    nodes: [{ id: "module", type: "module", x: 0, y: 0, module: inner }],
    wires: [],
  };
  const onChange = vi.fn();
  render(
    <LogicBuilder
      storageKey={null}
      challenge={{
        circuit: root,
        enforce: (circuit) => circuit,
        palette: ["nand"],
        onChange,
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Enter Inner" }));
  fireEvent.click(screen.getByTitle("Drag NAND onto canvas or click to add"));
  const saved: Circuit = onChange.mock.lastCall![0];
  expect(saved.name).toBe("Root");
  expect(saved.nodes).toHaveLength(1);
  expect(saved.nodes[0].module?.nodes).toHaveLength(2);
  expect(saved.nodes[0].module?.nodes[1].type).toBe("nand");
});
