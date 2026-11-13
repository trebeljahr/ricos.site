// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChordBuilder } from "./ChordBuilder";
import { Keyboard } from "./Keyboard";

afterEach(cleanup);

const symbol = () => screen.getByText(/chord symbol/).nextElementSibling?.textContent;

describe("chord builder", () => {
  it("starts on a C major triad and names each new stack", () => {
    render(<ChordBuilder />);
    expect(symbol()).toBe("C");
    fireEvent.click(screen.getByRole("button", { name: "+ minor third" }));
    expect(symbol()).toBe("C7");
    fireEvent.click(screen.getByRole("button", { name: "+ major third" }));
    expect(symbol()).toBe("C9");
    fireEvent.click(screen.getByRole("button", { name: "Remove top" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove top" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove top" }));
    fireEvent.click(screen.getByRole("button", { name: "+ major third" }));
    expect(symbol()).toBe("C+");
  });

  it("stops at a thirteenth", () => {
    render(<ChordBuilder />);
    for (let i = 0; i < 4; i++)
      fireEvent.click(screen.getByRole("button", { name: "+ minor third" }));
    expect(screen.getByRole("button", { name: "+ minor third" })).toHaveProperty("disabled", true);
  });

  it("switches one third in the stack between major and minor", () => {
    render(<ChordBuilder />);
    fireEvent.click(screen.getByRole("button", { name: /^major third from C to E/ }));
    expect(symbol()).toBe("C°");
    fireEvent.click(screen.getByRole("button", { name: /^minor third from E♭ to G♭/ }));
    expect(symbol()).toBe("Cm");
  });

  it("alternates major and minor thirds up to the thirteenth", () => {
    render(<ChordBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Alternate up to the 13th" }));
    expect(symbol()).toBe("Cmaj13(♯11)");
    expect(screen.getByText(/alternating thirds/)).toBeTruthy();
  });
});

describe("keyboard", () => {
  it("draws seven white and five black keys per octave, and marks", () => {
    const { container } = render(
      <Keyboard from={60} to={71} marks={{ 64: { label: "3" } }} onKeyDown={() => {}} />,
    );
    expect(container.querySelectorAll("[data-midi]")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "E4" }).textContent).toContain("3");
  });
});
