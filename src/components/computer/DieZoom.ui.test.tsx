// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
      "The nickel beside it is shown at the same scale: 21.21 mm across.",
    );
    const whole = zoomTag(container);
    expect(whole).toBe("×1.0");
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0);

    click("ALIGNMENT MARK");
    expect(container.textContent).toContain("Four arrows that lined up the masks");
    expect(screen.getByText("50 µm")).toBeTruthy();
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
    expect(
      screen.getByRole("img", { name: "Photograph of a 1 euro coin" }).getAttribute("src"),
    ).toBe("/images/computer/coins/euro-2003.webp");
    expect(screen.queryByRole("button", { name: "AU $1" })).toBeNull();
    const before = zoomTag(container);
    click("Zoom in");
    expect(zoomTag(container)).not.toBe(before);

    const photo = screen.getByRole("application");
    act(() => {
      fireEvent.keyDown(photo, { key: "0" });
    });
    expect(zoomTag(container)).toBe(before);
  });

  it("keeps the selected area's label at its visible top-left corner while zooming", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("L1 DATA CACHE");
    const label = () => within(photo).getByText("L1 DATA CACHE");
    const position = () => {
      const element = label();
      const outline = element.parentElement!;
      return {
        x: Number.parseFloat(outline.style.left) + Number.parseFloat(element.style.left),
        y: Number.parseFloat(outline.style.top) + Number.parseFloat(element.style.top),
      };
    };
    expect(position().x).toBeGreaterThan(3);
    expect(position().y).toBeGreaterThan(3);
    click("Zoom in");
    click("Zoom in");
    expect(position().x).toBeCloseTo(3);
    expect(position().y).toBeCloseTo(3);
    fireEvent.keyDown(photo, { key: "ArrowRight" });
    expect(position().x).toBeCloseTo(3);
    click("ALL");
    expect(within(photo).queryByText("L1 DATA CACHE")).toBeNull();
  });

  it("keeps naming the selected area when zooming out makes its box too small", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("ALIGNMENT MARK");
    expect(within(photo).getByText("ALIGNMENT MARK")).toBeTruthy();
    for (let i = 0; i < 8; i++) click("Zoom out");
    expect(within(photo).getByText("ALIGNMENT MARK")).toBeTruthy();
  });

  it("clears the selection on a tap outside it, keeping the view", () => {
    const { container } = render(<DieZoom />);
    const photo = screen.getByRole("application");
    const tap = (clientX: number, clientY: number) => {
      fireEvent.pointerDown(photo, { pointerId: 1, clientX, clientY });
      fireEvent.pointerUp(photo, { pointerId: 1, clientX, clientY });
    };
    click("ALIGNMENT MARK");
    for (let i = 0; i < 2; i++) click("Zoom out");
    const zoomedOut = zoomTag(container);

    // Inside the selected box, which is centred on the screen.
    tap(400, 250);
    expect(within(photo).getByText("ALIGNMENT MARK")).toBeTruthy();

    // A drag that starts outside only moves the photo.
    fireEvent.pointerDown(photo, { pointerId: 1, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(photo, { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerUp(photo, { pointerId: 1, clientX: 60, clientY: 40 });
    expect(within(photo).getByText("ALIGNMENT MARK")).toBeTruthy();

    // The block keeps its plain outline, so check the readout rather than the label.
    expect(container.textContent).not.toContain("THE WHOLE DIE");
    tap(5, 5);
    expect(container.textContent).toContain("THE WHOLE DIE");
    expect(screen.queryByRole("group", { name: /close-ups/ })).toBeNull();
    expect(zoomTag(container)).toBe(zoomedOut);
  });

  it("labels selected close-ups and retains candidate uncertainty on the photo", () => {
    render(<DieZoom />);
    const photo = screen.getByRole("application");
    click("X86 DECODERS");
    expect(within(photo).getByText("X86 DECODERS")).toBeTruthy();
    click("SIMPLE DECODER 1");
    expect(within(photo).getByText("SIMPLE DECODER 1")).toBeTruthy();
    click("MICROCODE ENTRY PLA?");
    expect(within(photo).getByText("CANDIDATE · MICROCODE ENTRY PLA?")).toBeTruthy();
  });

  it("opens outlined regions and their decoder close-ups", () => {
    const { container } = render(<DieZoom />);
    click("Zoom to x86 decoders");
    expect(screen.getByRole("group", { name: "Decoder close-ups" })).toBeTruthy();
    const overview = zoomTag(container);
    click("Zoom to simple decoder 1");
    expect(container.textContent).toContain("A second simple decoder does the same job below it.");
    expect(zoomTag(container)).not.toBe(overview);
    click("FULL DECODER");
    expect(container.textContent).toContain("Four translation arrays");
    click("SIMPLE DECODER 2");
    expect(container.textContent).toContain(
      "The second simple decoder also produces one micro-operation",
    );
    click("ALL");
    expect(screen.queryByRole("group", { name: "Decoder close-ups" })).toBeNull();
    expect(screen.getByRole("button", { name: "Zoom to x86 decoders" })).toBeTruthy();
  });

  it("stops all zoom inputs at the 50 µm view and allows zooming back out", () => {
    const { container } = render(<DieZoom />);
    for (let i = 0; i < 12; i++) click("Zoom in");
    expect(screen.getByText("50 µm")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    const limit = zoomTag(container);
    const photo = screen.getByRole("application");
    // Off-centre attempts must neither zoom further nor move the view.
    const tileStyles = () => [...photo.querySelectorAll("img")].map((img) => img.style.cssText);
    const atLimit = tileStyles();
    fireEvent.keyDown(photo, { key: "+" });
    fireEvent.wheel(photo, { ctrlKey: true, deltaY: -1000, clientX: 150, clientY: 100 });
    fireEvent.doubleClick(photo, { clientX: 150, clientY: 100 });
    fireEvent.pointerDown(photo, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(photo, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(photo, { pointerId: 2, clientX: 400, clientY: 100 });
    fireEvent.pointerUp(photo, { pointerId: 1 });
    fireEvent.pointerUp(photo, { pointerId: 2 });
    expect(zoomTag(container)).toBe(limit);
    expect(tileStyles()).toEqual(atLimit);
    expect(screen.getByText("50 µm")).toBeTruthy();

    click("Zoom out");
    expect(zoomTag(container)).not.toBe(limit);
    expect(
      screen.getByRole("button", { name: "Zoom in" }).getAttribute("aria-disabled"),
    ).toBeNull();
  });

  it("explores other core regions and distinguishes matched outlines from photo annotations", () => {
    const { container } = render(<DieZoom />);
    const whole = zoomTag(container);
    click("DIE");
    expect(zoomTag(container)).not.toBe(whole);
    click("Zoom to l1 data cache");
    expect(container.textContent).toContain("16 KB holds recently used data");
    expect(screen.getByRole("link", { name: "Deschutes P6 core map" })).toBeTruthy();
    expect(container.textContent).toContain("Outline approximate.");
    click("MICROCODE ROM");
    expect(container.textContent).toContain("stores sequences of micro-operations");
    click("ALIGNMENT MARK");
    expect(screen.queryByRole("link", { name: "Deschutes P6 core map" })).toBeNull();
  });

  it("opens context-specific close-ups and keeps candidate identifications separate", () => {
    const { container } = render(<DieZoom />);
    click("INSTRUCTION FETCH");
    expect(screen.getByRole("group", { name: "instruction fetch close-ups" })).toBeTruthy();
    click("INSTRUCTION BUFFER");
    expect(container.textContent).toContain("Fetched instruction bytes wait here before decoding.");

    click("FLOATING POINT");
    const closeUps = screen.getByRole("group", { name: "floating point close-ups" });
    expect(within(closeUps).queryByRole("button", { name: "FP CONSTANT ROM?" })).toBeNull();
    const candidates = screen.getByRole("group", { name: "Unconfirmed candidates" });
    fireEvent.click(within(candidates).getByRole("button", { name: "FP CONSTANT ROM?" }));
    expect(container.textContent).toContain("CANDIDATE · FP CONSTANT ROM?");
    expect(container.textContent).toContain("function and location unconfirmed");
    click("FP CONVERSION");
    expect(container.textContent).toContain("converts between memory formats");
    expect(container.textContent).not.toContain("function and location unconfirmed");

    click("ADDRESS TRANSLATION");
    click("TRANSLATION STORAGE");
    expect(container.textContent).toContain("cached address-translation information");
    click("BRANCH PREDICTION");
    click("BRANCH-TARGET STORAGE");
    expect(container.textContent).toContain("previously encountered branches");
    click("ALL");
    expect(screen.queryByRole("group", { name: "Unconfirmed candidates" })).toBeNull();
    expect(screen.queryByRole("button", { name: "FP CONSTANT ROM?" })).toBeNull();
  });

  it("keeps unconfirmed register and capacitor targets available under their parent regions", () => {
    const { container } = render(<DieZoom />);
    click("REORDER / RETIREMENT");
    click("RETIREMENT REGISTERS?");
    expect(container.textContent).toContain("CANDIDATE · RETIREMENT REGISTERS?");
    click("REORDER BUFFER ARRAYS?");
    expect(container.textContent).toContain("individual storage arrays are not established");
    click("SCHEDULER");
    click("DECOUPLING CAPACITOR?");
    expect(container.textContent).toContain("If so, it stores charge locally");
    click("X86 DECODERS");
    expect(screen.getByRole("group", { name: "Decoder close-ups" })).toBeTruthy();
    click("MICROCODE ENTRY PLA?");
    expect(container.textContent).toContain("may select the starting address");
    click("DECODER ALIAS CONTROL?");
    expect(container.textContent).toContain("it differs from register renaming");
    click("FULL DECODER");
    expect(container.textContent).not.toContain("function and location unconfirmed");
  });
});
