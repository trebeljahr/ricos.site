// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChordFamily } from "./ChordFamily";
import { ChordInversions } from "./ChordInversions";
import { ChordPad } from "./ChordPad";
import { CircleOfFifths } from "./CircleOfFifths";
import { ModeRotator } from "./ModeRotator";
import { PentatonicBlues } from "./PentatonicBlues";

afterEach(cleanup);

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const live = () =>
  [...document.querySelectorAll("[aria-live='polite']")].map((el) => el.textContent).join(" | ");

describe("chord inversions", () => {
  it("names the bass note and keeps it when a third is stacked on top", () => {
    render(<ChordInversions />);
    expect(live()).toContain("C");
    click("1st inversion");
    expect(live()).toContain("C/E");
    click("+ minor third");
    expect(live()).toContain("C7/E");
    expect(screen.getByRole("button", { name: "1st inversion" })).toHaveProperty(
      "ariaPressed",
      "true",
    );
  });
});

describe("chord family", () => {
  it("keeps the triad whose notes all fit the key", () => {
    render(<ChordFamily />);
    click("major");
    click("Next degree");
    click("major");
    expect(screen.getByText("2 of 3 in C major")).toBeTruthy();
    click("minor");
    const slots = screen.getByRole("list", { name: "Degrees of C major" });
    expect(slots.textContent).toContain("I");
    expect(slots.textContent).toContain("ii");
    expect(slots.textContent).toContain("Dm");
  });
});

describe("pentatonic and blues", () => {
  it("finds the same five notes from the relative minor, then adds the blue note", () => {
    render(<PentatonicBlues />);
    click("Pentatonic");
    expect(live()).toContain("C major pentatonic");
    click("A minor");
    click("Blues");
    expect(live()).toContain("A minor blues");
    expect(screen.getByText("A · C · D · E♭ · E · G")).toBeTruthy();
  });
});

describe("mode rotator", () => {
  it("lowers one note per step towards the dark end", () => {
    render(<ModeRotator />);
    expect(live()).toContain("C major");
    click("Darker ▶");
    expect(live()).toContain("C Mixolydian");
    expect(screen.getByText("7→♭7")).toBeTruthy();
    expect(screen.getByText("F major")).toBeTruthy();
  });
});

describe("circle of fifths", () => {
  it("turns to a neighbour that shares six notes", () => {
    render(<CircleOfFifths />);
    click("Turn to G major");
    expect(screen.getAllByText("G major").length).toBeGreaterThan(0);
    expect(screen.getByText("6 of 7")).toBeTruthy();
    expect(live()).toContain("F♯");
  });
});

describe("chord pad", () => {
  it("leads the voices to the nearest notes of the next chord", () => {
    render(<ChordPad />);
    click(/^I, C/);
    click(/^IV, F/);
    expect(live()).toContain("IV · F");
    // C E G → C F A: one and two half steps.
    expect(screen.getByText("half steps moved").nextElementSibling?.textContent).toBe("3");
    expect(screen.getByText("E→F +1")).toBeTruthy();
    expect(screen.getByText("G→A +2")).toBeTruthy();
  });
});
