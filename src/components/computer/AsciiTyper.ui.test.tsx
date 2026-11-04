// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsciiTyper } from "./AsciiTyper";

const { playType, playRefuse, playButton } = vi.hoisted(() => ({
  playType: vi.fn(),
  playRefuse: vi.fn(),
  playButton: vi.fn(),
}));
vi.mock("src/hooks/usePanelSound", async (importOriginal) => {
  const original = await importOriginal<typeof import("src/hooks/usePanelSound")>();
  return {
    ...original,
    usePanelSound: () => ({ ...original.usePanelSound(), playType, playRefuse, playButton }),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  localStorage.clear();
  playType.mockClear();
  playRefuse.mockClear();
  playButton.mockClear();
});

function setup() {
  render(<AsciiTyper />);
  const input = screen.getByLabelText("TYPE HERE") as HTMLTextAreaElement;
  const tiles = () =>
    within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((tile) => tile.firstElementChild?.textContent);
  return { input, tiles };
}

describe("AsciiTyper", () => {
  it("shows one tile per character and marks the last one typed", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "Hi" } });
    expect(tiles()).toEqual(["H", "i"]);
    const tilesInOrder = screen.getAllByRole("listitem");
    expect(tilesInOrder[0].dataset.latest).toBeUndefined();
    expect(tilesInOrder[1].dataset.latest).toBe("true");
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("turns Enter into a line feed tile", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "Hi\n" } });
    expect(tiles()).toEqual(["H", "i", "LF"]);
    expect(screen.getAllByRole("listitem").at(-1)?.dataset.latest).toBe("true");
  });

  it("strikes a typewriter key for each character and thuds on a refused one", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "Hellox" } });
    expect(playType).toHaveBeenLastCalledWith("key");
    fireEvent.change(input, { target: { value: "Hellox " } });
    expect(playType).toHaveBeenLastCalledWith("space");
    fireEvent.change(input, { target: { value: "Hellox" } });
    expect(playType).toHaveBeenLastCalledWith("back");
    fireEvent.change(input, { target: { value: "Helloxé" } });
    expect(playRefuse).toHaveBeenCalledTimes(1);
  });

  it("backspaces the old text away and types the new one when a preset is pressed", () => {
    vi.useFakeTimers();
    const { input } = setup();
    fireEvent.change(input, { target: { value: "Hi" } });
    playType.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "123" }));
    expect(playButton).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("H");
    act(() => {
      vi.advanceTimersByTime(45);
    });
    expect(input.value).toBe("");
    act(() => {
      vi.advanceTimersByTime(130);
    });
    expect(input.value).toBe("1");
    act(() => {
      vi.runAllTimers();
    });
    expect(input.value).toBe("123");
    expect(playType.mock.calls.map(([stroke]) => stroke)).toEqual([
      "back",
      "back",
      "key",
      "key",
      "key",
    ]);
    expect(screen.getByRole("button", { name: "123" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("stops the retyping as soon as a key is pressed by hand", () => {
    vi.useFakeTimers();
    const { input } = setup();
    fireEvent.click(screen.getByRole("button", { name: "123" }));
    fireEvent.change(input, { target: { value: "ok" } });
    act(() => {
      vi.runAllTimers();
    });
    expect(input.value).toBe("ok");
  });

  it("offers the rarer corners of ASCII, control characters included", () => {
    vi.useFakeTimers();
    const { tiles } = setup();
    fireEvent.click(screen.getByRole("button", { name: "ESC[31mRED" }));
    act(() => {
      vi.runAllTimers();
    });
    expect(tiles().at(0)).toBe("ESC");
    expect(tiles().at(-1)).toBe("BEL");
    expect(playType).toHaveBeenLastCalledWith("bell");
  });

  it("refuses characters outside ASCII and says why", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "né 😀" } });
    expect(input.value).toBe("n ");
    expect(tiles()).toEqual(["n", "SP"]);
    expect(screen.getByRole("status").textContent).toBe("NOT IN ASCII: é 😀");
    fireEvent.change(input, { target: { value: "n !" } });
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
