// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClockFacts } from "./ClockFacts";

afterEach(cleanup);

const preset = (name: RegExp) => screen.getByRole("button", { name });
const meter = (name: string) =>
  screen.getByText(name, { selector: "dt" }).parentElement?.querySelector("dd")?.textContent;

describe("clock facts demo", () => {
  it("starts at today's desktop CPU and writes out its size", () => {
    const { container } = render(<ClockFacts />);
    expect(preset(/^DESKTOP CPU, TODAY: 4.5 gigahertz/).getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("4,500,000,000");
    expect(container.textContent).toContain("4.5 BILLION");
    expect(meter("ONE TICK LASTS")).toBe("0.222 ns");
    expect(meter("LIGHT IN ONE TICK")).toBe("6.66 cm");
    expect(meter("ONE JET ENGINE TURN")).toBe("18,000,000");
    expect(meter("IF EACH TICK TOOK 1 s")).toBe("143 years");
  });

  it("holds the checked speeds of old machines", () => {
    const { container } = render(<ClockFacts />);
    fireEvent.click(preset(/^INTEL 4004, 1971: 740 kilohertz/));
    expect(preset(/^DESKTOP CPU/).getAttribute("aria-pressed")).toBe("false");
    expect(container.textContent).toContain("740,000");
    fireEvent.click(preset(/^APPLE II, 1977: 1.023 megahertz/));
    expect(container.textContent).toContain("1,023,000");
    fireEvent.click(preset(/^IBM PC, 1981: 4.77 megahertz/));
    expect(container.textContent).toContain("4,770,000");
    expect(meter("ONE TICK LASTS")).toBe("210 ns");
  });

  it("stays readable at one tick a second and announces the choice", () => {
    const { container } = render(<ClockFacts />);
    fireEvent.click(preset(/^1 PER SECOND: 1 hertz/));
    expect(meter("ONE TICK LASTS")).toBe("1 s");
    expect(meter("ONE JET ENGINE TURN")).toBe("0.004");
    expect(container.querySelector("p[aria-live]")?.textContent).toBe(
      "1 hertz: 1 tick every second. One tick lasts 1 second.",
    );
  });
});
