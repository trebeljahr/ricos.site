// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

/** The builders on the page, each as a scope for queries. */
const builders = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-logic-builder]")).map((element) =>
    within(element),
  );

const boardParts = (builder: ReturnType<typeof within>) =>
  within(builder.getByRole("application", { name: "Circuit canvas" })).queryAllByRole("group", {
    name: / part$/,
  });

describe("LogicTutorial", () => {
  it("guides the NOT level step by step and turns the solution into a part", () => {
    render(<LogicTutorial levels={["not", "and"]} level="not" />);
    const [builder] = builders();
    expect(builder.getByText(/OUT is the opposite of A/)).toBeTruthy();
    const steps = builder.getByRole("list", { name: "Steps" });
    expect(within(steps).getAllByRole("listitem")[0].getAttribute("aria-current")).toBe("step");
    expect(boardParts(builder)).toHaveLength(2);

    // Show me places the reference's NAND, then wires it, one action per press.
    fireEvent.click(builder.getByRole("button", { name: "Show me" }));
    expect(boardParts(builder)).toHaveLength(3);
    expect(within(steps).getAllByRole("listitem")[1].getAttribute("aria-current")).toBe("step");
    for (let press = 0; press < 3; press++)
      fireEvent.click(builder.getByRole("button", { name: "Show me" }));

    fireEvent.click(builder.getByRole("button", { name: "Check" }));
    expect(builder.getByText(/Pass: all 2 rows match/)).toBeTruthy();
    expect(builder.getByText(/Same size as the reference/)).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
    expect(
      stored.solved.not.circuit.nodes.some((node: { type: string }) => node.type === "nand"),
    ).toBe(true);

    // The AND level offers the reader's own NOT, with the built-in one as a chip.
    fireEvent.click(builder.getByRole("button", { name: /Next: AND/ }));
    // A new level mounts a fresh board.
    const [andBuilder] = builders();
    const own = andBuilder.getByTitle(/Your NOT, checked against every row/);
    expect(own.closest("[data-palette-part]")?.getAttribute("data-palette-part")).toBe("part:not");
    expect(andBuilder.getByRole("button", { name: "Add the built-in NOT" })).toBeTruthy();
    fireEvent.click(own);
    const placed = boardParts(andBuilder).find((part) =>
      /NOT \(yours\)/.test(part.getAttribute("aria-label") ?? ""),
    );
    expect(placed).toBeTruthy();
  });

  it("names the first failing row", () => {
    render(<LogicTutorial levels={["and"]} />);
    const [builder] = builders();
    fireEvent.click(builder.getByRole("button", { name: "Show me" }));
    fireEvent.click(builder.getByRole("button", { name: "Show me" }));
    fireEvent.click(builder.getByRole("button", { name: "Show me" }));
    // A NAND wired straight to OUT: every row is the opposite of AND.
    act(() => {
      fireEvent.click(builder.getByRole("button", { name: "Check" }));
    });
    expect(builder.getByText(/cannot run yet|Row 1 fails/)).toBeTruthy();
  });
});

describe("several builders on one page", () => {
  it("keeps boards, checks and keyboard shortcuts apart", () => {
    render(
      <>
        <LogicTutorial levels={["not"]} />
        <LogicTutorial levels={["xor"]} />
      </>,
    );
    const [first, second] = builders();
    expect(first.getByRole("heading", { name: "NOT" })).toBeTruthy();
    expect(second.getByRole("heading", { name: "XOR" })).toBeTruthy();

    fireEvent.click(first.getByRole("button", { name: "Show me" }));
    expect(boardParts(first)).toHaveLength(3);
    expect(boardParts(second)).toHaveLength(3);

    fireEvent.click(second.getByRole("button", { name: "Show me" }));
    expect(boardParts(second)).toHaveLength(4);

    // Undo goes to the builder used last, the second one.
    fireEvent.pointerDown(second.getByRole("application", { name: "Circuit canvas" }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(boardParts(second)).toHaveLength(3);
    expect(boardParts(first)).toHaveLength(3);

    // Focus left on a button of the first builder does not pull undo back there.
    first.getByRole("button", { name: "Show me" }).focus();
    fireEvent.pointerDown(second.getByRole("application", { name: "Circuit canvas" }));
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(second.getByRole("button", { name: "Show me" }));
    expect(boardParts(second)).toHaveLength(4);
    fireEvent.pointerDown(second.getByRole("application", { name: "Circuit canvas" }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(boardParts(second)).toHaveLength(3);
    expect(boardParts(first)).toHaveLength(3);

    // Pointing at the first builder moves undo there.
    fireEvent.pointerDown(first.getByRole("application", { name: "Circuit canvas" }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(boardParts(first)).toHaveLength(2);
    expect(boardParts(second)).toHaveLength(3);

    fireEvent.click(first.getByRole("button", { name: "Check" }));
    expect(first.queryByText(/cannot run yet/)).toBeTruthy();
    expect(second.queryByText(/cannot run yet/)).toBeNull();
  });

  it("shows a part solved in one builder in the other's palette at once", () => {
    render(
      <>
        <LogicTutorial levels={["not"]} />
        <LogicTutorial levels={["and"]} />
      </>,
    );
    const [first, second] = builders();
    expect(second.queryByTitle(/Your NOT/)).toBeNull();
    // NOT from NAND: place the NAND, wire A in twice, wire it to OUT.
    for (let press = 0; press < 4; press++)
      fireEvent.click(first.getByRole("button", { name: "Show me" }));
    fireEvent.click(first.getByRole("button", { name: "Check" }));
    expect(second.getByTitle(/Your NOT, checked against every row/)).toBeTruthy();
  });

  it("gives every builder its own dialog ids", () => {
    render(
      <>
        <LogicBuilder storageKey="first" />
        <LogicBuilder storageKey="second" />
      </>,
    );
    const ids = Array.from(document.querySelectorAll("[id]")).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lets only one free builder save to a storage key", () => {
    render(
      <>
        <LogicBuilder storageKey="shared" />
        <LogicBuilder storageKey="shared" />
      </>,
    );
    expect(
      screen.getAllByText(/Another builder on this page saves to browser storage/),
    ).toHaveLength(1);
  });
});

describe("own parts in the free builder", () => {
  it("marks a built part, offers both versions, and locks unbuilt parts in only-mine mode", () => {
    const { unmount } = render(<LogicTutorial levels={["not"]} />);
    const [tutorial] = builders();
    for (let press = 0; press < 4; press++)
      fireEvent.click(tutorial.getByRole("button", { name: "Show me" }));
    fireEvent.click(tutorial.getByRole("button", { name: "Check" }));
    unmount();

    render(<LogicBuilder storageKey={null} />);
    const palette = screen.getByLabelText("Gate palette");
    const notRow = palette.querySelector('[data-palette-part="not"]') as HTMLElement;
    expect(within(notRow).getByTitle(/Your NOT, checked against every row/)).toBeTruthy();
    expect(within(notRow).getByRole("button", { name: "Add the built-in NOT" })).toBeTruthy();

    act(() => setOwnPartsMode("only-mine"));
    const andRow = palette.querySelector('[data-palette-part="and"]') as HTMLElement;
    const build = within(andRow).getByRole("link", { name: /Build it/ });
    expect(build.getAttribute("href")).toBe("/computer/build-from-nand?level=and");
    // NAND comes from an optional level, so it is never locked.
    const nandRow = palette.querySelector('[data-palette-part="nand"]') as HTMLElement;
    expect(within(nandRow).queryByRole("link")).toBeNull();

    act(() => setOwnPartsMode("built-in"));
    expect(within(notRow).getByRole("button", { name: "Add your NOT" })).toBeTruthy();
  });
});
