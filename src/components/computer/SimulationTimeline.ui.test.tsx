// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";
import { testButton } from "./testButton";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(cleanup);

const button = (name: string | RegExp) => testButton(name);
const scrubber = () => screen.getByRole("slider", { name: "Recorded ticks" }) as HTMLInputElement;
const shown = () => screen.getByLabelText("Shown tick").textContent;
const clock = () => within(screen.getByLabelText("Clock status")).getByText(/^CLK /).textContent;
const addPart = (title: string) =>
  fireEvent.click(screen.getByTitle(`Drag ${title} onto canvas or click to add`));

describe("simulation timeline", () => {
  it("steps back to a recorded tick and replays it forward", () => {
    render(<LogicBuilder />);
    addPart("CLOCK");
    expect(button("Back ½ cycle").disabled).toBe(true);
    for (let count = 0; count < 3; count++) fireEvent.click(button("Step ½ cycle"));
    expect(shown()).toBe("Cycle 1");
    expect(clock()).toBe("CLK 1");
    expect(scrubber().max).toBe("3");

    fireEvent.click(button("Back ½ cycle"));
    expect(clock()).toBe("CLK 0");
    expect(shown()).toContain("Cycle 1");
    fireEvent.click(button("Back ½ cycle"));
    expect(shown()).toContain("Cycle 0");
    expect(clock()).toBe("CLK 1");
    expect(within(screen.getByLabelText("Clock status")).getByText("Cycle 0")).toBeTruthy();

    fireEvent.click(button("Step ½ cycle"));
    expect(scrubber().value).toBe("2");
    expect(scrubber().max).toBe("3");
    fireEvent.change(scrubber(), { target: { value: "0" } });
    expect(shown()).toBe("Cycle 0 ⟲");
    expect(clock()).toBe("CLK 0");
    expect(button("Back ½ cycle").disabled).toBe(true);
    fireEvent.change(scrubber(), { target: { value: "3" } });
    expect(shown()).toBe("Cycle 1");
  }, 15000);

  it("keeps the cycle count and starts a fresh timeline inside a module", () => {
    render(<LogicBuilder />);
    addPart("CLOCK");
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", {
        name: "8-bit parallel register",
      }),
    );
    for (let count = 0; count < 3; count++) fireEvent.click(button("Step ½ cycle"));
    fireEvent.click(button("Enter 8-bit parallel register"));
    expect(shown()).toBe("Cycle 1");
    expect(button("Back ½ cycle").disabled).toBe(true);
    fireEvent.click(button("Step ½ cycle"));
    expect(shown()).toBe("Cycle 2");
    fireEvent.click(button("← Back"));
    expect(shown()).toBe("Cycle 2");
    expect(button("Back ½ cycle").disabled).toBe(true);
  }, 15000);
});
