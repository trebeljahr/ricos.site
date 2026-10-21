// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AsciiTable } from "./AsciiTable";
import { AsciiTyper } from "./AsciiTyper";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function setup() {
  render(<AsciiTable />);
  const group = screen.getByRole("group");
  const slot = (code: number) => group.querySelector(`[data-code="${code}"]`) as HTMLButtonElement;
  const detail = () => screen.getByText(/^(PRINTABLE|CONTROL)$/).previousElementSibling;
  return { group, slot, detail };
}

describe("AsciiTable", () => {
  it("reads printable and control entries by pointer, focus, and click without a typer", () => {
    const { slot, detail } = setup();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(detail()?.textContent).toBe("Capital letter A");
    fireEvent.mouseOver(slot(66));
    expect(detail()?.textContent).toBe("Capital letter B");
    fireEvent.focus(slot(10));
    expect(detail()?.textContent).toBe("Line feed");
    fireEvent.click(slot(27));
    expect(detail()?.textContent).toBe("Escape");
    expect(slot(27).dataset.lit).toBe("latest");
    expect(slot(27).getAttribute("aria-label")).toBe(
      "27: Escape, control character. Bits 0011011, hex 1B.",
    );
  });

  it("keeps all 128 slots to one tab stop and supports arrow keys", () => {
    const { group, slot } = setup();
    expect(group.querySelectorAll("[data-code]")).toHaveLength(128);
    expect(group.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    fireEvent.focus(slot(65));
    fireEvent.keyDown(slot(65), { key: "ArrowRight" });
    expect(document.activeElement).toBe(slot(66));
    fireEvent.keyDown(slot(66), { key: "End" });
    expect(document.activeElement).toBe(slot(127));
  });

  it("works alongside a typer without changing its text or lookup selection", () => {
    render(
      <>
        <AsciiTable />
        <AsciiTyper />
      </>,
    );
    const table = screen.getByRole("region", { name: "ASCII table explorer" });
    const input = screen.getByLabelText("TYPE HERE") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Hi" } });
    expect(within(table).getByText("Capital letter A")).toBeTruthy();
    fireEvent.click(within(table).getByRole("button", { name: /^27: Escape/ }));
    expect(input.value).toBe("Hi");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
