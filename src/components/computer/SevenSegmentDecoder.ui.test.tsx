// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SEGMENTS, segmentBits } from "src/lib/computer/segmentNames";
import { afterEach, describe, expect, it } from "vitest";
import { SevenSegmentDecoder } from "./SevenSegmentDecoder";

afterEach(cleanup);

const litBars = (container: HTMLElement) =>
  SEGMENTS.map(
    (name) =>
      container.querySelector(`[data-segment="${name}"]`)?.getAttribute("data-on") === "true",
  );
const litRows = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-digit][data-on="true"]')].map((row) =>
    row.getAttribute("data-digit"),
  );
const button = (name: string) => screen.getByRole("button", { name });

describe("seven-segment decoder demo", () => {
  it("decodes the bits the switches set", () => {
    const { container } = render(<SevenSegmentDecoder />);
    expect(litRows(container)).toEqual(["5"]);
    expect(litBars(container)).toEqual(segmentBits(5));

    fireEvent.click(button("Bit 2"));
    expect(litRows(container)).toEqual(["7"]);
    expect(litBars(container)).toEqual(segmentBits(7));
    expect(button("Bit 2").getAttribute("aria-pressed")).toBe("true");
  });

  it("lights no digit line and no bar for 10 to 15", () => {
    const { container } = render(<SevenSegmentDecoder />);
    fireEvent.click(button("Bit 8"));
    expect(litRows(container)).toEqual([]);
    expect(litBars(container).some(Boolean)).toBe(false);
    expect(container.querySelector("[aria-live]")?.textContent).toContain("blank");
  });

  it("sets the input from a digit line, by click and by keyboard", () => {
    const { container } = render(<SevenSegmentDecoder />);
    fireEvent.click(button("Digit 8"));
    expect(litBars(container)).toEqual(segmentBits(8));
    expect(button("Bit 8").getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(button("Digit 3"), { key: "Enter" });
    expect(litRows(container)).toEqual(["3"]);
  });
});
