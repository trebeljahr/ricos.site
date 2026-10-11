// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STEPPER_LEVELS } from "../../lib/computer/stepperLevels";
import { ProgramStepper } from "./ProgramStepper";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const machine = () => within(screen.getByLabelText("Program execution instrument"));
const button = (name: string | RegExp) => machine().queryByRole("button", { name });
const editor = () => screen.getByLabelText(/WRITE/) as HTMLTextAreaElement;
const slider = () => screen.getByLabelText("Execution phase") as HTMLInputElement;
const toEnd = () => fireEvent.change(slider(), { target: { value: slider().max } });
const write = (source: string) => {
  fireEvent.change(editor(), { target: { value: source } });
  fireEvent.click(button(/COMPILE \+ RESET/)!);
};
const mnemonics = () =>
  Array.from(
    screen.getByText("INSTRUCTION SET / VIEW KEY").parentElement!.querySelectorAll("div > div"),
  ).map((row) => row.querySelectorAll("b")[1]?.textContent);

describe("the program stepper, one machine per level", () => {
  it("is the plain CPU by default: source, tape, registers, RAM and output, nothing else", () => {
    render(<ProgramStepper />);
    expect(editor().value).toBe("let x = 2;\nx = x + 3;\nprint(x);");
    expect(screen.getByText("8-BIT · MODEL 01")).toBeTruthy();
    for (const name of ["2 + 3", "OVERFLOW", "FOR LOOP"]) expect(button(name)).toBeTruthy();
    for (const name of ["FUNCTION", "RECURSION", "KEYBOARD", "SMILEY", "PLOT", "BLIT", "STAMP"])
      expect(button(name)).toBeNull();
    expect(button(/STACK IN RAM/)).toBeNull();
    expect(button("ASSEMBLY")).toBeNull();
    expect(button(/MICROCODE TABLE/)).toBeNull();
    expect(screen.queryByText("PROGRAMS FROM EARLIER MODELS")).toBeNull();
    expect(screen.queryByText(/CALL STACK/)).toBeNull();
    expect(screen.queryByRole("img", { name: /^Screen rows/ })).toBeNull();
    expect(screen.queryByLabelText("Interrupt path")).toBeNull();
    expect(mnemonics()).toEqual([
      "LDI",
      "LDM",
      "STM",
      "ADDI",
      "ADDM",
      "SUBI",
      "SUBM",
      "OUT",
      "JMP",
      "JNC",
      "HALT",
    ]);
    toEnd();
    expect(screen.getByText("5", { selector: "div" })).toBeTruthy();
  });

  it("rejects a function on the plain CPU and names the machine that runs it", () => {
    render(<ProgramStepper demoLinks />);
    write("fn bump(n) {\n  return n + 1;\n}\nprint(bump(2));");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(
      "Line 4: A function needs a call stack, and this machine has none yet. Model 02, “Call a function and come back”, adds it.",
    );
    expect(within(alert).getByRole("link").getAttribute("href")).toBe("/computer/call-stack");
    expect(screen.queryByLabelText("Execution phase")).toBeNull();
    // Without the demo pages around it, the stepper names the model as plain text.
    cleanup();
    render(<ProgramStepper />);
    write("screen[0] = 255;");
    expect(screen.getByRole("alert").textContent).toMatch(/Model 05, “Draw on a screen/);
    expect(within(screen.getByRole("alert")).queryByRole("link")).toBeNull();
  });

  it("adds the call stack on the next machine and keeps the earlier programs behind a fold", () => {
    render(<ProgramStepper level="calls" />);
    expect(screen.getByText("8-BIT · MODEL 02 · + CALL STACK")).toBeTruthy();
    expect(mnemonics()).toContain("CALL");
    expect(mnemonics()).not.toContain("RETI");
    expect(button(/STACK IN RAM/)).toBeNull();
    const stack = () => screen.getByText("CALL STACK / TOP AT RIGHT").parentElement!.textContent;
    expect(stack()).toContain("EMPTY");
    // Step until the first CALL has pushed its return address.
    let step = 0;
    while (stack()?.includes("EMPTY") && step < Number(slider().max))
      fireEvent.change(slider(), { target: { value: String(++step) } });
    expect(stack()).toMatch(/→[0-9A-F]{2}/);
    fireEvent.click(button("NESTED")!);
    toEnd();
    expect(screen.getByText("12", { selector: "div" })).toBeTruthy();
    const fold = screen.getByText("PROGRAMS FROM EARLIER MODELS").parentElement!;
    fireEvent.click(within(fold).getByRole("button", { name: "FOR LOOP" }));
    toEnd();
    expect(screen.getByText("6", { selector: "div" })).toBeTruthy();
    // Recursion needs the next machine's CPU.
    write("fn down(n) {\n  if (n > 0) {\n    let less = n - 1;\n    down(less);\n  }\n}\ndown(2);");
    expect(screen.getByRole("alert").textContent).toMatch(
      /stack-in-RAM CPU.*Model 03, “Move the stack into RAM and recurse”, adds it\.$/,
    );
  });

  it("starts the stack-in-RAM machine on its CPU and lets it switch back", () => {
    render(<ProgramStepper level="ramStack" />);
    expect(button(/STACK IN RAM/)?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/STACK IN RAM \/ SP = 20/)).toBeTruthy();
    toEnd();
    expect(screen.getByText("10", { selector: "div" })).toBeTruthy();
    fireEvent.click(button(/SEPARATE RETURN STACK/)!);
    expect(screen.getByRole("alert").textContent).toMatch(/Recursive calls need/);
    expect(within(screen.getByRole("alert")).queryByRole("link")).toBeNull();
  });

  it("shows the key port from its machine on, and the stack only when a later program uses it", () => {
    render(<ProgramStepper level="interrupts" />);
    expect(screen.getByLabelText("Interrupt path")).toBeTruthy();
    expect(screen.getByText("CALL STACK / TOP AT RIGHT")).toBeTruthy();
    cleanup();
    render(<ProgramStepper level="screen" />);
    expect(screen.getByRole("img", { name: /^Screen rows/ })).toBeTruthy();
    expect(screen.queryByLabelText("Interrupt path")).toBeNull();
    expect(screen.queryByText(/CALL STACK/)).toBeNull();
    expect(screen.queryByLabelText("Pixel cursor")).toBeNull();
    fireEvent.click(button("KEY ROW")!);
    expect(screen.getByLabelText("Interrupt path")).toBeTruthy();
    expect(screen.getByText("CALL STACK / TOP AT RIGHT")).toBeTruthy();
    // The stack's long explanation belongs to the machines that introduce it.
    expect(screen.queryByText(/CALL pushes the code address/)).toBeNull();
  });

  it("brings the CPU switch back on a later machine when a program needs the other CPU", () => {
    render(<ProgramStepper level="screen" />);
    expect(button(/STACK IN RAM/)).toBeNull();
    write("fn down(n) {\n  if (n > 0) {\n    let less = n - 1;\n    down(less);\n  }\n}\ndown(2);");
    expect(screen.getByRole("alert").textContent).toMatch(/Recursive calls need/);
    fireEvent.click(button(/STACK IN RAM/)!);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(button(/STACK IN RAM/)?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/STACK IN RAM \/ SP = 20/)).toBeTruthy();
    // An earlier machine's RECURSION program switches the CPU by itself.
    cleanup();
    render(<ProgramStepper level="pixelPort" />);
    fireEvent.click(button("RECURSION")!);
    expect(button(/SEPARATE RETURN STACK/)?.getAttribute("aria-pressed")).toBe("false");
  });

  it("runs every machine's first program to the end", () => {
    for (const level of STEPPER_LEVELS) {
      render(<ProgramStepper level={level.part} />);
      expect(editor().value, level.part).toBe(level.presets[0].source);
      expect(screen.queryByRole("alert"), level.part).toBeNull();
      toEnd();
      expect(screen.getByText("HALTED"), level.part).toBeTruthy();
      cleanup();
    }
  }, 30000);

  it("opens the microcode table and assembly on the last machine only", () => {
    render(<ProgramStepper level="bigBlitter" />);
    expect(button(/MICROCODE TABLE/)).toBeNull();
    cleanup();
    render(<ProgramStepper level="microcode" />);
    expect(button("HIDE MICROCODE TABLE")).toBeTruthy();
    expect(button("ASSEMBLY")?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button("AND + JZ")!);
    toEnd();
    expect(screen.getByText("12 8 4 0", { selector: "div" })).toBeTruthy();
  }, 20000);
});
