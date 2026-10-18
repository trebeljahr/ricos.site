// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DieZoom } from "./DieZoom";

beforeEach(() => {
  // jsdom lays nothing out; give the photo screen a size.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 500,
    width: 800,
    height: 500,
    toJSON: () => ({}),
  });
  // Animations finish at once.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const zoomTag = (container: HTMLElement) =>
  [...container.querySelectorAll("div")].find((element) =>
    /^×[\d.,]+$/.test(element.textContent ?? ""),
  )?.textContent;

describe("die zoom", () => {
  it("shows the whole die next to a coin, then zooms to a spot", () => {
    const { container } = render(<DieZoom />);
    expect(container.textContent).toContain("The die is about 17 mm × 10 mm.");
    expect(container.textContent).toContain(
      "The nickel beside it is drawn to the same scale: 21.21 mm across.",
    );
    const whole = zoomTag(container);
    expect(whole).toBe("×1.0");
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0);

    click("ALIGNMENT MARK");
    expect(container.textContent).toContain("Four arrows that lined up the masks");
    expect(zoomTag(container)).not.toBe(whole);
    const sources = [...container.querySelectorAll("img")].map((img) =>
      decodeURIComponent(img.getAttribute("src") ?? ""),
    );
    expect(sources.some((src) => src.includes("die-shots/pentium-ii-dixon/6/25_19/640.webp"))).toBe(
      true,
    );

    click("ALL");
    expect(zoomTag(container)).toBe("×1.0");
  });

  it("swaps the coin and zooms with the keys", () => {
    const { container } = render(<DieZoom />);
    click("1 EURO");
    expect(container.textContent).toContain("The 1 euro coin beside it");
    const before = zoomTag(container);
    click("Zoom in");
    expect(zoomTag(container)).not.toBe(before);

    const photo = screen.getByRole("application");
    act(() => {
      fireEvent.keyDown(photo, { key: "0" });
    });
    expect(zoomTag(container)).toBe(before);
  });
});
