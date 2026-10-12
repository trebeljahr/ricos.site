// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STEPPER_DEMOS, type StepperDemo } from "../../lib/computer/stepperDemos";
import { SAMPLE_PROGRAMS } from "../../lib/computerStepper";
import { ProgramStepper } from "./ProgramStepper";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const demoAt = (slug: string) => STEPPER_DEMOS.find((demo) => demo.slug === slug)!;
/** Renders the stepper the way a demo's page does. */
const show = ({ focus, presets }: StepperDemo) =>
  render(<ProgramStepper focus={focus ?? undefined} presets={presets} />);
const machine = () => within(screen.getByLabelText("Program execution instrument"));
const button = (name: string | RegExp) => machine().queryByRole("button", { name });
const editor = () => screen.getByLabelText(/WRITE/) as HTMLTextAreaElement;
const slider = () => screen.getByLabelText("Execution phase") as HTMLInputElement;
const toEnd = () => fireEvent.change(slider(), { target: { value: slider().max } });
const write = (source: string) => {
  fireEvent.change(editor(), { target: { value: source } });
  fireEvent.click(button(/COMPILE \+ RESET/)!);
};
const RECURSIVE =
  "fn down(n) {\n  if (n > 0) {\n    let less = n - 1;\n    down(less);\n  }\n}\ndown(2);";

describe("the program stepper", () => {
  it("is the plain CPU by default: source, tape, registers, RAM and output, nothing else", () => {
    render(<ProgramStepper />);
    expect(editor().value).toBe("let x = 2;\nx = x + 3;\nprint(x);");
    expect(
      machine()
        .getAllByRole("button")
        .map((item) => item.textContent?.trim()),
    ).toEqual([
      "SOUND ON",
      "COMPILE + RESET",
      "2 + 3",
      "OVERFLOW",
      "FOR LOOP",
      "← BACK",
      "NEXT PHASE →",
      "RESET",
    ]);
    expect(screen.queryByText(/CALL STACK/)).toBeNull();
    expect(screen.queryByRole("img", { name: /^Screen rows/ })).toBeNull();
    expect(screen.queryByLabelText("Interrupt path")).toBeNull();
    toEnd();
    expect(screen.getByText("5", { selector: "div" })).toBeTruthy();
  });

  it("runs any program on any demo and shows a part's readout once the program uses it", () => {
    render(<ProgramStepper />);
    write("fn bump(n) {\n  return n + 1;\n}\nprint(bump(2));");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("CALL STACK / TOP AT RIGHT")).toBeTruthy();
    // The long explanation of the stack belongs to the demos about the stack.
    expect(screen.queryByText(/CALL pushes the code address/)).toBeNull();
    toEnd();
    expect(screen.getByText("3", { selector: "div" })).toBeTruthy();
    write("screen[0] = 255;");
    expect(screen.getByRole("img", { name: /^Screen rows 00/ })).toBeTruthy();
    expect(screen.queryByText(/CALL STACK/)).toBeNull();
  });

  it("shows the call stack on its demo and explains it there", () => {
    show(demoAt("call-stack"));
    const stack = () => screen.getByText("CALL STACK / TOP AT RIGHT").parentElement!.textContent;
    expect(stack()).toContain("EMPTY");
    expect(screen.getByText(/CALL pushes the code address/)).toBeTruthy();
    // Step until the first CALL has pushed its return address.
    let step = 0;
    while (stack()?.includes("EMPTY") && step < Number(slider().max))
      fireEvent.change(slider(), { target: { value: String(++step) } });
    expect(stack()).toMatch(/→[0-9A-F]{2}/);
    fireEvent.click(button("NESTED")!);
    toEnd();
    expect(screen.getByText("12", { selector: "div" })).toBeTruthy();
    expect(button(/STACK IN RAM/)).toBeNull();
  });

  it("offers the CPU switch on the stack-in-RAM demo, and elsewhere when a program needs it", () => {
    show(demoAt("stack-in-ram"));
    expect(button(/STACK IN RAM/)?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/STACK IN RAM \/ SP = 20/)).toBeTruthy();
    toEnd();
    expect(screen.getByText("10", { selector: "div" })).toBeTruthy();
    fireEvent.click(button(/SEPARATE RETURN STACK/)!);
    expect(screen.getByRole("alert").textContent).toMatch(/Recursive calls need/);
    cleanup();
    show(demoAt("call-stack"));
    expect(button(/STACK IN RAM/)).toBeNull();
    write(RECURSIVE);
    expect(screen.getByRole("alert").textContent).toMatch(/Recursive calls need/);
    fireEvent.click(button(/STACK IN RAM/)!);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/STACK IN RAM \/ SP = 20/)).toBeTruthy();
  });

  it("keeps each demo to the readout of its own part", () => {
    show(demoAt("key-interrupts"));
    expect(screen.getByLabelText("Interrupt path")).toBeTruthy();
    expect(screen.getByText("CALL STACK / TOP AT RIGHT")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /^Screen rows/ })).toBeNull();
    // KEY ROW draws on the screen as well, so the screen's readout comes with it.
    fireEvent.click(button("KEY ROW")!);
    expect(screen.getByRole("img", { name: /^Screen rows/ })).toBeTruthy();
    expect(screen.queryByLabelText("Pixel cursor")).toBeNull();
    cleanup();
    show(demoAt("call-stack"));
    expect(screen.queryByLabelText("Interrupt path")).toBeNull();
    expect(screen.queryByRole("img", { name: /^Screen rows/ })).toBeNull();
  });

  it("keeps the readouts of the devices for typed programs that use them", () => {
    render(<ProgramStepper />);
    write(SAMPLE_PROGRAMS.SMILEY);
    expect(screen.getByRole("img", { name: /^Screen rows/ })).toBeTruthy();
    expect(screen.queryByLabelText("Pixel cursor")).toBeNull();
    write(SAMPLE_PROGRAMS.CROSS);
    expect(screen.getByLabelText("Pixel cursor")).toBeTruthy();
    expect(screen.queryByLabelText("Blitter")).toBeNull();
    write(SAMPLE_PROGRAMS.BLIT);
    expect(screen.getByLabelText("Blitter")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /^Big screen/ })).toBeNull();
    write(SAMPLE_PROGRAMS.PORT);
    expect(screen.getByLabelText("Port")).toBeTruthy();
    expect(screen.queryByLabelText("Big blitter")).toBeNull();
    write(SAMPLE_PROGRAMS.STAMP);
    expect(screen.getByLabelText("Big blitter")).toBeTruthy();
    expect(screen.queryByLabelText("Port")).toBeNull();
  }, 30000);

  it("runs every demo's first program to the end", () => {
    for (const demo of STEPPER_DEMOS) {
      show(demo);
      expect(editor().value, demo.slug).toBe(demo.presets[0].source);
      expect(screen.queryByRole("alert"), demo.slug).toBeNull();
      toEnd();
      expect(screen.getByText("HALTED"), demo.slug).toBeTruthy();
      cleanup();
    }
  }, 60000);

  it("opens the microcode table and assembly on the microcode demo only", () => {
    show(demoAt("call-stack"));
    expect(button(/MICROCODE TABLE/)).toBeNull();
    expect(button("ASSEMBLY")).toBeNull();
    cleanup();
    show(demoAt("microcode-table"));
    expect(button("HIDE MICROCODE TABLE")).toBeTruthy();
    expect(button("ASSEMBLY")?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button("AND + JZ")!);
    toEnd();
    expect(screen.getByText("12 8 4 0", { selector: "div" })).toBeTruthy();
  }, 30000);
});
