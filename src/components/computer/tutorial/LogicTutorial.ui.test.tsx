// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
afterEach(cleanup);
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

describe("independent tutorials", () => {
  it("starts with goal, context, table and available blocks; hints never edit the board", () => {
    render(<LogicTutorial levels={["not", "and"]} />);
    const [b] = builders();
    expect(b.getByText(/OUT is the opposite of A/)).toBeTruthy();
    expect(b.getByRole("heading", { name: "Truth table" })).toBeTruthy();
    expect(b.getByText(/Available blocks: NAND/)).toBeTruthy();
    expect(b.queryByRole("list", { name: "Steps" })).toBeNull();
    expect(b.queryByRole("button", { name: "Show me" })).toBeNull();
    expect(b.queryByRole("list", { name: "Hints" })).toBeNull();
    const before = boardParts(b).length;
    fireEvent.click(b.getByRole("button", { name: "Check" }));
    expect(b.queryByRole("list", { name: "Hints" })).toBeNull();
    const hint = b.getByRole("button", { name: "Hint" });
    hint.focus();
    fireEvent.click(hint);
    expect(hint.getAttribute("aria-expanded")).toBe("true");
    expect(b.getByRole("list", { name: "Hints" }).textContent).toMatch(/Nothing drives OUT/);
    fireEvent.click(b.getByRole("button", { name: "Another hint" }));
    expect(boardParts(b)).toHaveLength(before);
    fireEvent.click(b.getByRole("button", { name: "Dismiss hints" }));
    expect(b.queryByRole("list", { name: "Hints" })).toBeNull();
  });
  it("checks a manually wired circuit, saves it, and offers a verified Yours part", () => {
    render(<LogicTutorial levels={["not", "and"]} />);
    const [b] = builders();
    buildNot(b);
    fireEvent.click(b.getByRole("button", { name: "Check" }));
    expect(b.getByText(/Pass: all 2 rows match/)).toBeTruthy();
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
    fireEvent.click(first.getByRole("button", { name: "Check" }));
    expect(second.getByTitle(/Your NOT, checked against every row/)).toBeTruthy();
    unmount();
    render(<LogicBuilder storageKey={null} />);
    act(() => setOwnPartsMode("only-mine"));
    expect(screen.getAllByRole("link", { name: /Build it/ }).length).toBeGreaterThan(0);
  });
});
