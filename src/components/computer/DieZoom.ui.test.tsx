// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

const key = (photo: HTMLElement, name: string) => fireEvent.keyDown(photo, { key: name });

describe("die zoom", () => {
  it("opens on the die with every region named, then zooms to a spot", () => {
    const { container } = render(<DieZoom />);
    const photo = screen.getByRole("application");
    expect(zoomTag(container)).toBe("×1.0");
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    for (const name of [
      "L2 CACHE",
      "L1 DATA CACHE",
      "L1 INSTRUCTION CACHE",
      "INSTRUCTION FETCH",
      "MEMORY ORDERING",
      "PAGE-MISS HANDLER",
      "ALIGNMENT MARK",
    ]) {
      expect(within(photo).getByText(name)).toBeTruthy();
    }

    click("Zoom to alignment mark");
    expect(screen.getByText("50 µm")).toBeTruthy();
    expect(zoomTag(container)).not.toBe("×1.0");
    const sources = [...container.querySelectorAll("img")].map((img) =>
      decodeURIComponent(img.getAttribute("src") ?? ""),
    );
    expect(sources.some((src) => src.includes("die-shots/pentium-ii-dixon/6/25_19/640.webp"))).toBe(
      true,
    );
  });

  it("keeps labels out of the clipped targets", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    expect(within(photo).getByText("ALIGNMENT MARK").closest("button")).toBeNull();
    expect(within(photo).getByText("L2 CACHE").closest("button")).toBeNull();
  });

  it("has no key rows or readout panel", () => {
    const { container } = render(<DieZoom />);
    expect(screen.queryByRole("button", { name: "ALL" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    expect(container.textContent).not.toContain("THE WHOLE DIE");
    expect(container.textContent).not.toContain("SCREEN WIDTH");
  });

  it("swaps the coin, showing it beside the die, and zooms with the keys", () => {
    const { container } = render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("1 EURO");
    expect(
      screen.getByRole("img", { name: "Photograph of a 1 euro coin" }).getAttribute("src"),
    ).toBe("/images/computer/coins/euro-2003.webp");
    const everything = zoomTag(container);
    key(photo, "+");
    expect(zoomTag(container)).not.toBe(everything);
    key(photo, "0");
    expect(zoomTag(container)).toBe(everything);
  });

  it("keeps the selected area's label at its visible top-left corner while zooming", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("Zoom to l1 data cache");
    const label = () => within(photo).getByText("L1 DATA CACHE");
    const position = () => {
      const element = label();
      return {
        x: Number.parseFloat(element.style.left),
        y: Number.parseFloat(element.style.top),
      };
    };
    expect(position().x).toBeGreaterThan(3);
    key(photo, "+");
    key(photo, "+");
    expect(position().x).toBeCloseTo(3);
    expect(position().y).toBeCloseTo(3);
    key(photo, "ArrowRight");
    expect(position().x).toBeCloseTo(3);
  });

  it("keeps naming a selected area and its close-ups when their boxes get small", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("Zoom to x86 decoders");
    expect(within(photo).getByText("X86 DECODERS")).toBeTruthy();
    expect(within(photo).getByText("SIMPLE DECODER 1")).toBeTruthy();
    for (let i = 0; i < 6; i++) key(photo, "-");
    expect(within(photo).getByText("X86 DECODERS")).toBeTruthy();
    expect(within(photo).getByText("SIMPLE DECODER 1")).toBeTruthy();
    expect(within(photo).getByText("MICROCODE ENTRY PLA?")).toBeTruthy();
  });

  it("calls a block the same at every zoom and when it is selected", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    const name = () => within(photo).getByText("INSTRUCTION FETCH");
    expect(name()).toBeTruthy();
    click("Zoom to instruction fetch");
    expect(name()).toBeTruthy();
    expect(within(photo).getByText("INSTRUCTION BUFFER")).toBeTruthy();
    for (let i = 0; i < 4; i++) key(photo, "+");
    expect(name()).toBeTruthy();
    for (let i = 0; i < 8; i++) key(photo, "-");
    expect(name()).toBeTruthy();
  });

  it("keeps the other regions and the parent on the map while one is selected", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("Zoom to x86 decoders");
    click("Zoom to simple decoder 1");
    expect(within(photo).getByText("SIMPLE DECODER 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom to simple decoder 2" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom to x86 decoders" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom to l2 cache" })).toBeTruthy();
    click("Zoom to l2 cache");
    expect(screen.queryByRole("button", { name: "Zoom to simple decoder 2" })).toBeNull();
  });

  it("clears the selection on a tap outside it, keeping the view", () => {
    const { container } = render(<DieZoom />);
    const photo = screen.getByRole("application");
    const closeUps = () => screen.queryByRole("button", { name: "Zoom to simple decoder 2" });
    const tap = (clientX: number, clientY: number) => {
      fireEvent.pointerDown(photo, { pointerId: 1, clientX, clientY });
      fireEvent.pointerUp(photo, { pointerId: 1, clientX, clientY });
    };
    click("Zoom to x86 decoders");
    const view = zoomTag(container);
    // Inside the selected outline, which is centred on the screen.
    tap(400, 250);
    expect(closeUps()).toBeTruthy();
    // A drag that starts outside only moves the photo.
    fireEvent.pointerDown(photo, { pointerId: 1, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(photo, { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerUp(photo, { pointerId: 1, clientX: 60, clientY: 40 });
    expect(closeUps()).toBeTruthy();
    tap(5, 5);
    expect(closeUps()).toBeNull();
    expect(zoomTag(container)).toBe(view);
  });

  it("draws every region as a polygon that only takes clicks inside its outline", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    for (const name of ["Zoom to x86 decoders", "Zoom to l2 cache"]) {
      const region = screen.getByRole("button", { name });
      expect(region.style.clipPath).toContain("polygon(");
      expect(region.querySelector("polygon")).toBeTruthy();
    }
    click("Zoom to x86 decoders");
    expect(photo.querySelector("path")).toBeTruthy();
  });

  it("reaches every region from the keyboard", () => {
    render(<DieZoom />);
    const region = screen.getByRole("button", { name: "Zoom to mmx" });
    expect(region.tabIndex).toBe(0);
  });

  it("keeps credits folded until asked, in the photo's corner", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    const details = within(photo).getByText("CREDITS").closest("details")!;
    expect(details.open).toBe(false);
    expect(within(details).getByRole("link", { name: /Martijn Boer/ })).toBeTruthy();
    expect(within(details).queryByRole("link", { name: "Deschutes P6 core map" })).toBeNull();
    click("Zoom to l1 data cache");
    expect(within(details).getByRole("link", { name: "Deschutes P6 core map" })).toBeTruthy();
    expect(details.textContent).toContain("Outline approximate.");
    click("Zoom to floating point");
    click("Zoom to candidate fp constant rom?");
    expect(details.textContent).toContain("function and location unconfirmed");
    expect(within(photo).getByText("FP CONSTANT ROM?")).toBeTruthy();
  });

  it("stops all zoom inputs at the 50 µm view and allows zooming back out", () => {
    const { container } = render(<DieZoom />);
    const photo = screen.getByRole("application");
    for (let i = 0; i < 12; i++) key(photo, "+");
    expect(screen.getByText("50 µm")).toBeTruthy();
    const limit = zoomTag(container);
    // Off-centre attempts must neither zoom further nor move the view.
    const tileStyles = () => [...photo.querySelectorAll("img")].map((img) => img.style.cssText);
    const atLimit = tileStyles();
    key(photo, "+");
    fireEvent.wheel(photo, { ctrlKey: true, deltaY: -1000, clientX: 150, clientY: 100 });
    fireEvent.doubleClick(photo, { clientX: 150, clientY: 100 });
    fireEvent.pointerDown(photo, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(photo, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(photo, { pointerId: 2, clientX: 400, clientY: 100 });
    fireEvent.pointerUp(photo, { pointerId: 1 });
    fireEvent.pointerUp(photo, { pointerId: 2 });
    expect(zoomTag(container)).toBe(limit);
    expect(tileStyles()).toEqual(atLimit);
    key(photo, "-");
    expect(zoomTag(container)).not.toBe(limit);
  });
});
