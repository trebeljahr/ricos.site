// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { levelById } from "../../../lib/computer/tutorial/levels";
import {
  PROGRESS_KEY,
  progressStore,
  setOwnPartsMode,
} from "../../../lib/computer/tutorial/progress";
import { LogicBuilder } from "../LogicBuilder";
import { LogicTutorial } from "./LogicTutorial";

beforeEach(() => {
  localStorage.clear();
  progressStore.reset();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const builders = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-logic-builder]")).map((element) =>
    within(element),
  );
const boardParts = (b: ReturnType<typeof within>) =>
  within(b.getByRole("application", { name: "Circuit canvas" })).queryAllByRole("group", {
    name: / part$/,
  });
function buildNot(b: ReturnType<typeof within>) {
  fireEvent.click(b.getByTitle("Drag NAND onto canvas or click to add"));
  const targets = b.getAllByRole("button", { name: /^Connect to NAND/ });
  for (const target of targets) {
    fireEvent.click(b.getByRole("button", { name: "Wire from A Output" }));
    fireEvent.click(target);
  }
  fireEvent.click(b.getByRole("button", { name: "Wire from NAND Output" }));
  fireEvent.click(b.getByRole("button", { name: /^Connect to OUT/ }));
}

describe("first run", () => {
  const wireATo = (b: ReturnType<typeof within>, target: string) => {
    fireEvent.click(b.getByRole("button", { name: "Wire from A Output" }));
    fireEvent.click(b.getByRole("button", { name: target }));
  };
  it("opens the whole ladder on transistors, with only the ports and rails placed", () => {
    render(<LogicTutorial sequential />);
    const [b] = builders();
    expect(b.getByRole("heading", { name: "NOT from transistors" })).toBeTruthy();
    expect(
      b.getByRole<HTMLOptionElement>("option", { name: /^1\. NOT from transistors/ }).value,
    ).toBe("cmos-not");
    const panel = b.getByRole("complementary", { name: "Level" }).textContent;
    expect(panel).not.toMatch(/conduct|rail|CMOS|junction|Boolean|A transistor is/i);
    expect(boardParts(b)).toHaveLength(4);
    expect(b.queryByRole("button", { name: "Connect to PMOS Gate (G)" })).toBeNull();
    expect(b.queryAllByRole("button", { name: /^Select wire from / })).toHaveLength(0);
  });
  it("solves the first level on its last wire and offers the next without pressing Check", () => {
    const reference = levelById("cmos-not")!.reference!();
    const draft = { ...reference, wires: reference.wires.filter((wire) => wire.from !== "a") };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ drafts: { "cmos-not": draft } }));
    progressStore.reset();
    render(<LogicTutorial sequential />);
    const [b] = builders();
    expect(b.queryByRole("button", { name: /^Next:/ })).toBeNull();
    wireATo(b, "Connect to PMOS Gate (G)");
    expect(b.queryByText("✓ Correct wiring.")).toBeNull();
    wireATo(b, "Connect to NMOS Gate (G)");
    expect(b.getByText("✓ Correct wiring.")).toBeTruthy();
    expect(progressStore.get().solved["cmos-not"]).toBeTruthy();
    fireEvent.click(b.getByRole("button", { name: "Next: NAND from transistors →" }));
    expect(builders()[0].getByRole("heading", { name: "NAND from transistors" })).toBeTruthy();
    expect(boardParts(builders()[0])).toHaveLength(5);
  });
  const levelOption = (id: string) =>
    document.querySelector<HTMLOptionElement>(`select[aria-label="Level"] option[value="${id}"]`)!;
  it("requires the transistor levels: NOT opens once they are solved or skipped", () => {
    render(<LogicTutorial sequential />);
    expect(
      screen.getByRole<HTMLOptionElement>("option", { name: /^1\. / }).textContent,
    ).not.toMatch(/optional/);
    expect(levelOption("cmos-nand").disabled).toBe(true);
    expect(levelOption("not").disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByRole("heading", { name: "NAND from transistors" })).toBeTruthy();
    expect(levelOption("not").disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByRole("heading", { name: "NOT" })).toBeTruthy();
    expect(screen.queryByText(/Solve or skip the levels before this one/)).toBeNull();
    expect(levelOption("not").disabled).toBe(false);
    expect(levelOption("and").disabled).toBe(true);
  });
  it("keeps a reader with progress further up open, up to the next unsolved level", () => {
    const solved = Object.fromEntries(
      ["not", "and"].map((id) => [id, { at: 1, circuit: levelById(id)!.reference!() }]),
    );
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ solved }));
    progressStore.reset();
    render(<LogicTutorial sequential level="or" />);
    expect(screen.getByRole("heading", { name: "OR" })).toBeTruthy();
    expect(screen.queryByText(/Solve or skip the levels before this one/)).toBeNull();
    for (const id of ["cmos-not", "cmos-nand", "not", "and", "or"])
      expect(levelOption(id).disabled, id).toBe(false);
    expect(levelOption("xor").disabled).toBe(true);
  });
  it("restores a saved transistor board as it was, without the new starting parts", () => {
    const reference = levelById("cmos-not")!.reference!();
    const rename = (id: string) => (/^n\d+$/.test(id) ? `mine-${id}` : id);
    const circuit = {
      ...reference,
      nodes: reference.nodes.map((node) => ({ ...node, id: rename(node.id) })),
      wires: reference.wires.map((wire) => ({
        ...wire,
        from: rename(wire.from),
        to: rename(wire.to),
      })),
    };
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ solved: { "cmos-not": { at: 1, circuit } }, skipped: ["cmos-nand"] }),
    );
    progressStore.reset();
    render(<LogicTutorial sequential />);
    expect(screen.getByText("Solved ✓")).toBeTruthy();
    expect(screen.getByText("✓ Correct wiring.")).toBeTruthy();
    expect(boardParts(builders()[0])).toHaveLength(reference.nodes.length);
    expect(progressStore.get().solved["cmos-not"].at).toBe(1);
    expect(progressStore.get().skipped).toEqual(["cmos-nand"]);
  });
});

describe("independent tutorials", () => {
  it("names only this site's section above a level", () => {
    render(<LogicTutorial levels={["not", "and"]} />);
    const panel = builders()[0].getByRole("complementary", { name: "Level" });
    expect(within(panel).getByText("Logic gates")).toBeTruthy();
    expect(panel.textContent).not.toMatch(/NandGame/i);
  });
  it("keeps wire joins in the hints, without advertising a standalone junction block", () => {
    render(<LogicTutorial levels={["cmos-nand"]} />);
    expect(screen.queryByText(/junction knob/)).toBeNull();
    for (const id of ["cmos-not", "cmos-nand"])
      expect(
        levelById(id)!
          .hints!.map((hint) => hint.text)
          .join(" "),
        id,
      ).toMatch(/release at the highlighted target/);
    expect(
      within(screen.getByLabelText("Gate palette")).queryByRole("button", { name: "JUNCTION" }),
    ).toBeNull();
  });
  it("leaves the builder's extras out of a single-gate level and explains the table", () => {
    render(<LogicTutorial levels={["universal-nor-or"]} />);
    expect(screen.queryByRole("region", { name: "Circuit toolbar" })).toBeNull();
    expect(screen.queryByLabelText("Search parts")).toBeNull();
    expect(screen.queryByText("My parts")).toBeNull();
    expect(screen.getByText("Build OR using only NOR gates.")).toBeTruthy();
    expect(screen.getByText(/truth table lists every setting/)).toBeTruthy();
    const controls = screen.getByRole("toolbar", { name: "Canvas view controls" });
    expect(within(controls).getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "OR from NOR" }).className).toBe("sr-only");
  });

  it("keeps the toolbar and parts controls on a level that does not turn them off", () => {
    render(<LogicTutorial levels={["not"]} />);
    expect(screen.getByRole("region", { name: "Circuit toolbar" })).toBeTruthy();
    expect(screen.getByLabelText("Search parts")).toBeTruthy();
    expect(screen.getByText("My parts")).toBeTruthy();
  });

  it("starts with one goal line and the table, no Check, and hints never edit the board", () => {
    render(<LogicTutorial levels={["not", "and"]} />);
    const [b] = builders();
    expect(b.getByText(/OUT is the opposite of A/)).toBeTruthy();
    expect(b.getByRole("heading", { name: "Truth table" })).toBeTruthy();
    expect(b.queryByText(/Available parts/)).toBeNull();
    expect(b.queryByRole("button", { name: "Check" })).toBeNull();
    expect(b.queryByRole("list", { name: "Steps" })).toBeNull();
    expect(b.queryByRole("button", { name: "Show me" })).toBeNull();
    expect(b.queryByRole("list", { name: "Hints" })).toBeNull();
    const before = boardParts(b).length;
    const hint = b.getByRole("button", { name: "Hint" });
    hint.focus();
    fireEvent.click(hint);
    expect(hint.getAttribute("aria-expanded")).toBe("true");
    expect(b.getByRole("list", { name: "Hints" }).textContent).toMatch(/Core idea/);
    fireEvent.click(b.getByRole("button", { name: /Another hint|Last hint/ }));
    expect(boardParts(b)).toHaveLength(before);
    fireEvent.click(b.getByRole("button", { name: "Dismiss hints" }));
    expect(b.queryByRole("list", { name: "Hints" })).toBeNull();
  });
  it("recognizes a manually wired circuit, saves it, and offers a verified Yours part", () => {
    render(<LogicTutorial levels={["not", "and"]} />);
    const [b] = builders();
    buildNot(b);
    expect(b.getByText("✓ Correct wiring.")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).solved.not.circuit.wires).toHaveLength(
      3,
    );
    fireEvent.click(b.getByRole("button", { name: /Next: AND/ }));
    const [next] = builders();
    fireEvent.click(next.getByTitle(/Your NOT, checked against every row/));
    expect(
      next.getAllByRole("img", { name: /Yours, exhaustively verified/ }).length,
    ).toBeGreaterThan(0);
  });
  it("restores v1 solutions, drafts, skips and settings without changing their keys", () => {
    const circuit = levelById("not")!.reference!();
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        solved: { not: { at: 1, circuit } },
        drafts: { not: circuit },
        skipped: ["or"],
        settings: { ownParts: "only-mine" },
      }),
    );
    progressStore.reset();
    render(<LogicTutorial levels={["not"]} />);
    const [b] = builders();
    expect(boardParts(b)).toHaveLength(3);
    expect(progressStore.get().settings.ownParts).toBe("only-mine");
    expect(progressStore.get().skipped).toContain("or");
    fireEvent.click(b.getByRole("button", { name: "Hint" }));
    fireEvent.click(b.getByRole("button", { name: "Reset" }));
    expect(boardParts(b)).toHaveLength(2);
    expect(b.queryByRole("list", { name: "Hints" })).toBeNull();
    expect(progressStore.get().solved.not.at).toBe(1);
  });
  it("uses one counter core with parameterized mastery and resets hint state on change", () => {
    render(<LogicTutorial level="manual-counter-2-up" />);
    const [b] = builders();
    const selector = b.getByRole("combobox", { name: "Counter challenge" });
    expect(within(selector).getAllByRole("option")).toHaveLength(21);
    fireEvent.click(b.getByRole("button", { name: "Hint" }));
    const options = within(selector).getAllByRole("option");
    fireEvent.change(selector, { target: { value: options[20].getAttribute("value") } });
    expect(builders()[0].queryByRole("list", { name: "Hints" })).toBeNull();
    expect(
      builders()[0].getByRole("combobox", { name: "Counter challenge" }).getAttribute("value"),
    ).not.toBe("manual-counter-2-up");
  });
  it("keeps universal gate embeds independent with no single-choice parameter selector", () => {
    render(
      <>
        <LogicTutorial levels={["universal-nand-not"]} />
        <LogicTutorial levels={["universal-nor-not"]} />
      </>,
    );
    const [nand, nor] = builders();
    expect(nand.queryByRole("combobox", { name: "Construction parameters" })).toBeNull();
    expect(nor.queryByRole("combobox", { name: "Construction parameters" })).toBeNull();
    expect(nand.queryByRole("list", { name: "Hints" })).toBeNull();
    expect(nor.queryByRole("list", { name: "Hints" })).toBeNull();
    buildNot(nand);
    expect(nand.getByText("✓ Correct wiring.")).toBeTruthy();
    expect(boardParts(nor)).toHaveLength(2);
    expect(nor.queryByText("✓ Correct wiring.")).toBeNull();
    fireEvent.click(nor.getByRole("button", { name: "Hint" }));
    expect(nor.getByRole("list", { name: "Hints" })).toBeTruthy();
    expect(nand.queryByRole("list", { name: "Hints" })).toBeNull();
  });
  it("flushes the latest draft on an immediate family unmount and restores it after a reload", () => {
    vi.useFakeTimers();
    function Families() {
      const [family, setFamily] = useState("nand");
      return (
        <>
          <button type="button" onClick={() => setFamily(family === "nand" ? "nor" : "nand")}>
            Switch family
          </button>
          <LogicTutorial key={family} levels={[`universal-${family}-not`]} />
        </>
      );
    }
    const { unmount } = render(<Families />);
    fireEvent.click(builders()[0].getByTitle("Drag NAND onto canvas or click to add"));
    fireEvent.click(screen.getByRole("button", { name: "Switch family" }));
    expect(boardParts(builders()[0])).toHaveLength(2);
    expect(progressStore.get().drafts["universal-nand-not"]).toMatchObject({
      nodes: expect.arrayContaining([expect.objectContaining({ type: "nand" })]),
    });
    fireEvent.click(builders()[0].getByTitle("Drag NOR onto canvas or click to add"));
    fireEvent.click(screen.getByRole("button", { name: "Switch family" }));
    expect(boardParts(builders()[0])).toHaveLength(3);
    expect(progressStore.get().drafts["universal-nor-not"]).toMatchObject({
      nodes: expect.arrayContaining([expect.objectContaining({ type: "nor" })]),
    });
    unmount();
    progressStore.reset();
    render(<LogicTutorial levels={["universal-nor-not"]} />);
    expect(boardParts(builders()[0])).toHaveLength(3);
  });
  it("flushes before switching levels and does not restore an edit discarded by Reset", () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <LogicTutorial levels={["universal-nand-not", "universal-nor-not"]} />,
    );
    fireEvent.click(builders()[0].getByTitle("Drag NAND onto canvas or click to add"));
    fireEvent.change(screen.getByRole("combobox", { name: "Level" }), {
      target: { value: "universal-nor-not" },
    });
    expect(boardParts(builders()[0])).toHaveLength(2);
    fireEvent.change(screen.getByRole("combobox", { name: "Level" }), {
      target: { value: "universal-nand-not" },
    });
    expect(boardParts(builders()[0])).toHaveLength(3);
    fireEvent.click(builders()[0].getByRole("button", { name: "Reset" }));
    unmount();
    progressStore.reset();
    render(<LogicTutorial levels={["universal-nand-not"]} />);
    expect(boardParts(builders()[0])).toHaveLength(2);
  });
  it.each([
    "pagehide",
    "visibilitychange",
  ])("saves the last edit on %s before the debounce fires", (event) => {
    vi.useFakeTimers();
    const { unmount } = render(<LogicTutorial levels={["not"]} />);
    fireEvent.click(builders()[0].getByTitle("Drag NAND onto canvas or click to add"));
    if (event === "pagehide") fireEvent(window, new Event(event));
    else {
      const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      fireEvent(document, new Event(event));
      visibility.mockRestore();
    }
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).drafts.not.nodes).toHaveLength(3);
    unmount();
    progressStore.reset();
    render(<LogicTutorial levels={["not"]} />);
    expect(boardParts(builders()[0])).toHaveLength(3);
  });
  it("keeps the passing solution when a later attempt is incomplete", () => {
    const { unmount } = render(<LogicTutorial levels={["not"]} />);
    buildNot(builders()[0]);
    fireEvent.click(builders()[0].getAllByRole("button", { name: /^Select wire from/ })[0]);
    fireEvent.keyDown(builders()[0].getByRole("application", { name: "Circuit canvas" }), {
      key: "Delete",
    });
    fireEvent.click(builders()[0].getByTitle("Drag NAND onto canvas or click to add"));
    fireEvent(window, new Event("pagehide"));
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)!);
    expect(progress.solved.not.circuit.nodes).toHaveLength(3);
    expect(progress.drafts.not.nodes).toHaveLength(4);
    unmount();
    progressStore.reset();
    render(<LogicTutorial levels={["not"]} />);
    expect(boardParts(builders()[0])).toHaveLength(4);
  });
  it("recognizes a slow level once the edits pause, and stores its full solution", () => {
    vi.useFakeTimers();
    const level = levelById("raw-seven-segment")!;
    expect(level.makes).toBeUndefined();
    const circuit = level.reference!();
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ drafts: { [level.id]: circuit } }));
    progressStore.reset();
    render(<LogicTutorial levels={[level.id]} />);
    expect(progressStore.get().solved[level.id]).toBeUndefined();
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText("✓ Correct wiring.")).toBeTruthy();
    expect(progressStore.get().solved[level.id].circuit).toMatchObject({
      nodes: circuit.nodes,
      wires: circuit.wires,
    });
  });
});

describe("several builders", () => {
  it("keeps hint state and active-builder undo apart", () => {
    render(
      <>
        <LogicTutorial levels={["not"]} />
        <LogicTutorial levels={["xor"]} />
      </>,
    );
    const [first, second] = builders();
    fireEvent.click(first.getByRole("button", { name: "Hint" }));
    expect(second.queryByRole("list", { name: "Hints" })).toBeNull();
    fireEvent.click(first.getByTitle("Drag NAND onto canvas or click to add"));
    fireEvent.click(second.getByTitle("Drag NAND onto canvas or click to add"));
    expect(boardParts(first)).toHaveLength(3);
    expect(boardParts(second)).toHaveLength(4);
    fireEvent.pointerDown(second.getByRole("application", { name: "Circuit canvas" }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(boardParts(first)).toHaveLength(3);
    expect(boardParts(second)).toHaveLength(3);
    const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("shares newly earned parts between builders and free-builder modes", () => {
    const { unmount } = render(
      <>
        <LogicTutorial levels={["not"]} />
        <LogicTutorial levels={["and"]} />
      </>,
    );
    const [first, second] = builders();
    buildNot(first);
    expect(second.getByTitle(/Your NOT, checked against every row/)).toBeTruthy();
    unmount();
    render(<LogicBuilder storageKey={null} />);
    act(() => setOwnPartsMode("only-mine"));
    expect(screen.getAllByRole("link", { name: /Build it/ }).length).toBeGreaterThan(0);
  });
});
