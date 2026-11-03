// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CharacterComposer } from "./CharacterComposer";
import { UnicodeInspector } from "./UnicodeInspector";
import { Utf8Encoder } from "./Utf8Encoder";
import { Utf8Reader } from "./Utf8Reader";

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
    expect(screen.getByRole("status").textContent).toContain("holds 48");
  });
});

describe("CharacterComposer", () => {
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
    press("NFC · COMPOSED");
    expect(count("CODE POINTS")).toBe("1");
    expect(screen.getByText("NFC 2 B · NFD 3 B")).toBeTruthy();
  });

  it("computes the Hangul syllable as a live readout", () => {
    render(<CharacterComposer />);
    press("HANGUL");
    press("NFC · COMPOSED");
    expect(screen.getAllByText("U+D55C").length).toBeGreaterThan(0);
    expect(screen.getByText("HANGUL SYLLABLE HAN")).toBeTruthy();
  });
});

describe("Utf8Encoder", () => {
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

describe("Utf8Reader", () => {
  const decoded = () =>
    within(screen.getByText("DECODED").closest("div")?.parentElement as HTMLElement).getByRole(
      "status",
    ).textContent;

  it("decodes the whole stream at first and steps back byte by byte", () => {
    render(<Utf8Reader />);
    expect(decoded()).toBe("Aé€😀");
    press("⏮ START");
    expect(decoded()).toBe(" ");
    press("NEXT BYTE ▶");
    expect(decoded()).toBe("A");
    press("NEXT BYTE ▶");
    expect(decoded()).toBe("A");
    expect(screen.getByText("1 OF 2")).toBeTruthy();
    press("NEXT BYTE ▶");
    expect(decoded()).toBe("Aé");
  });

  it("recovers when reading starts inside a character", () => {
    render(<Utf8Reader />);
    // Byte 2 is the continuation byte of é.
    press("Byte 2, A9");
    press("READ FROM HERE");
    expect(decoded()).toBe("�€😀");
  });

  it("breaks one character, and only one, when a byte is deleted", () => {
    render(<Utf8Reader />);
    press("Byte 1, C3");
    press("DELETE BYTE");
    expect(decoded()).toBe("A�€😀");
  });

  it("flips a bit of the selected byte", () => {
    render(<Utf8Reader />);
    press("Byte 0, 41");
    press("Bit 5");
    expect(decoded()).toBe("aé€😀");
  });
});
