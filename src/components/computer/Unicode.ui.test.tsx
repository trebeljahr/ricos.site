// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CharacterComposer } from "./CharacterComposer";
import { UnicodeInspector } from "./UnicodeInspector";
import { Utf8Encoder } from "./Utf8Encoder";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const count = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("UnicodeInspector", () => {
  it("counts all three levels of what is typed", () => {
    render(<UnicodeInspector />);
    fireEvent.change(screen.getByLabelText("TYPE OR PASTE ANYTHING"), {
      target: { value: "a👍🏽" },
    });
    expect(count("GRAPHEMES")).toBe("2");
    expect(count("CODE POINTS")).toBe("3");
    expect(count("BYTES")).toBe("9");
    expect(screen.getByText("U+1F3FD")).toBeTruthy();
    expect(screen.getByText("EMOJI MODIFIER FITZPATRICK TYPE-4")).toBeTruthy();
  });

  it("shows the two spellings of é as different bytes", () => {
    render(<UnicodeInspector />);
    press("é U+00E9");
    expect(count("BYTES")).toBe("2");
    press("é e + ◌́");
    expect(count("GRAPHEMES")).toBe("1");
    expect(count("BYTES")).toBe("3");
  });

  it("cuts long text and says so", () => {
    render(<UnicodeInspector />);
    fireEvent.change(screen.getByLabelText("TYPE OR PASTE ANYTHING"), {
      target: { value: "x".repeat(60) },
    });
    expect(count("CODE POINTS")).toBe("48");
    expect(screen.getByRole("status").textContent).toBe("FULL");
    expect(screen.getByText("48 / 48")).toBeTruthy();
  });
});

describe("TextLayers in the inspector", () => {
  it("draws a one-code-point cluster once and a built one with its parts", () => {
    render(<UnicodeInspector />);
    press("é U+00E9");
    const layers = () => within(screen.getByRole("list", { name: "Graphemes" }));
    expect(layers().getAllByText("é")).toHaveLength(1);
    press("👍🏽");
    expect(layers().getByRole("list", { name: "Code points" }).children).toHaveLength(2);
    expect(layers().getByText("👍🏽")).toBeTruthy();
    expect(layers().getByText("👍")).toBeTruthy();
  });

  it("gives every byte in bits as well as hex", () => {
    render(<UnicodeInspector />);
    press("é U+00E9");
    const run = screen.getByRole("list", { name: "All bytes in order" });
    expect(run.textContent).toBe("11000011C310101001A9");
  });
});

describe("CharacterComposer", () => {
  const module = (name: string) => within(screen.getByRole("group", { name }));
  const verdict = () => screen.getByTestId("composer-verdict").textContent;

  it("keeps every module on the panel whichever one is chosen", () => {
    render(<CharacterComposer />);
    const count = () => screen.getAllByRole("button").length;
    const before = count();
    for (const name of ["JOINER", "FLAG", "MARKS", "HANGUL", "STYLE", "SKIN TONE"]) {
      press(name);
      expect(count()).toBe(before);
      expect(screen.getByRole("button", { name, pressed: true })).toBeTruthy();
    }
  });

  it("names the languages that write a letter, and says when it finds none", () => {
    render(<CharacterComposer />);
    press("MARKS");
    expect(verdict()).toContain("SPANISH");
    fireEvent.click(screen.getByRole("button", { name: "LATIN U+0301" }));
    fireEvent.click(screen.getByRole("button", { name: "LATIN U+0327" }));
    fireEvent.click(screen.getByRole("button", { name: "LATIN U+030A" }));
    expect(verdict()).toBe("NO LANGUAGE FOUND");
  });

  it("lifts a rival mark the way interlocked keys do", () => {
    render(<CharacterComposer />);
    const key = (name: string) => screen.getByRole("button", { name });
    fireEvent.click(key("ARABIC base ب"));
    fireEvent.click(key("ARABIC U+064E"));
    fireEvent.click(key("ARABIC U+064F"));
    expect(key("ARABIC U+064E").getAttribute("aria-pressed")).toBe("false");
    expect(key("ARABIC U+064F").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(key("ARABIC U+0651"));
    expect(key("ARABIC U+064F").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(key("ARABIC U+0652"));
    expect(key("ARABIC U+064F").getAttribute("aria-pressed")).toBe("false");
    expect(key("ARABIC U+0651").getAttribute("aria-pressed")).toBe("false");
  });

  it("checks an emoji against the standard list", () => {
    render(<CharacterComposer />);
    expect(verdict()).toBe("STANDARD EMOJI");
    press("FLAG");
    fireEvent.click(screen.getByRole("button", { name: "Next second letter" }));
    expect(verdict()).toContain("NOT A STANDARD EMOJI");
  });

  it("falls apart into separate emoji when the joiner is off", () => {
    render(<CharacterComposer />);
    press("JOINER");
    expect(count("GRAPHEMES")).toBe("1");
    expect(count("CODE POINTS")).toBe("3");
    press("OFF");
    expect(count("GRAPHEMES")).toBe("2");
    expect(count("CODE POINTS")).toBe("2");
  });

  it("switches an accent between composed and decomposed", () => {
    render(<CharacterComposer />);
    press("MARKS");
    expect(count("CODE POINTS")).toBe("2");
    fireEvent.click(module("MARKS").getByRole("button", { name: "NFC · COMPOSED" }));
    expect(count("CODE POINTS")).toBe("1");
    expect(screen.queryByText(/NFC \d+ B/)).toBeNull();
  });

  it("computes the Hangul syllable as a live readout", () => {
    render(<CharacterComposer />);
    press("HANGUL");
    fireEvent.click(module("HANGUL").getByRole("button", { name: "NFC · COMPOSED" }));
    expect(screen.getAllByText("U+D55C").length).toBeGreaterThan(0);
    expect(screen.getByText("HANGUL SYLLABLE HAN")).toBeTruthy();
  });
});

describe("Utf8Encoder", () => {
  it("shows the symbol on a stop key, and the number only where there is no symbol", () => {
    render(<Utf8Encoder />);
    const face = (name: string) => screen.getByRole("button", { name }).textContent;
    expect(face("U+0041")).toBe("A");
    expect(face("U+07FF")).toBe("\u07ff");
    expect(face("U+0800")).toBe("\u0800");
    expect(face("U+10000")).toBe("\u{10000}");
    expect(face("U+007F")).toBe("DEL");
    expect(face("U+0080")).toBe("U+0080");
    expect(face("U+FFFF")).toBe("U+FFFF");
    expect(face("U+10FFFF")).toBe("U+10FFFF");
  });

  it("has a sound switch", () => {
    render(<Utf8Encoder />);
    press("Sound on. Toggle sound.");
    expect(screen.getByRole("button", { name: "Sound off. Toggle sound." })).toBeTruthy();
  });

  it("moves up a byte when a step crosses a range boundary", () => {
    render(<Utf8Encoder />);
    press("U+007F");
    expect(screen.getByText("1 BYTE")).toBeTruthy();
    press("Next code point");
    expect(screen.getByText("2 BYTES")).toBeTruthy();
    expect(screen.getByText("C2")).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();
  });

  it("flips a bit of the code point", () => {
    render(<Utf8Encoder />);
    press("U+0080");
    press("Bit 0");
    expect(screen.getAllByText("U+0081").length).toBeGreaterThan(0);
  });

  it("refuses surrogates and numbers past the code space", () => {
    render(<Utf8Encoder />);
    press("U+0800");
    press("Bit 15");
    press("Bit 14");
    press("Bit 12");
    expect(screen.getByRole("status").textContent).toBe(
      "U+D800 is a surrogate. It has no UTF-8 form.",
    );
    press("U+10FFFF");
    press("Next code point");
    expect(screen.getByRole("status").textContent).toBe(
      "U+110000 is above U+10FFFF. It is not in Unicode.",
    );
    expect(screen.getByText("NO BYTES")).toBeTruthy();
  });

  it("takes a typed character", () => {
    render(<Utf8Encoder />);
    fireEvent.change(screen.getByLabelText("TYPE A CHARACTER"), { target: { value: "€" } });
    expect(screen.getByText("U+20AC")).toBeTruthy();
    expect(screen.getByText("EURO SIGN")).toBeTruthy();
  });
});
