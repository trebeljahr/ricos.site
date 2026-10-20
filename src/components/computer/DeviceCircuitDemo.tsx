import { useCallback } from "react";
import { type DeviceKind, deviceDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";

const LESSONS: Record<DeviceKind, string> = {
  screen:
    "F0–F7 select the eight screen rows. Store a byte to replace that row's pixels. Bit 0 is the leftmost pixel.",
  pixel:
    "Store X at F8 and Y at F9, then store 0 or 1 at FA. The plotter changes one pixel and preserves its neighbours.",
  blitter:
    "Store X, Y, COLOUR and ARG at E0–E3. Store a command at E4: 1 clears, 2 fills a row, 3 draws a horizontal line, 4 draws a vertical line, 5 plots, 6 copies the sprite ROM. Then disable writes and run the clock.",
  bank: "D0–D7 are the eight row bytes of one tile. Store a tile number from 0 to 15 at BANK (D8), then write its rows through the window. Unfold the screen card to find BANK and VRAM.",
  vram: "D9 sets ADDR, DA reads or writes its byte, and DB sets STEP: 0 advances one byte, 1 advances four. READ ENABLE also advances ADDR when reading DA. Unfold the screen card to follow the port.",
  "big-blitter":
    "Store DST at DC, SRC at DD and SIZE at DE. SIZE packs columns minus one in bits 0–1 and rows minus one in bits 2–6. Store 1 at DF to fill from SRC, or 2 to copy from address SRC. Disable writes and run the clock. Unfold the screen card to trace the blitter.",
  scanout:
    "Write rows at F0–F7 while the scanout reads a second VRAM port. The monitor changes one pixel per clock tick. Reading FB gives VBLANK in bit 0.",
};

/** The same memory bus and hardware blocks as the CPU, driven by hand. */
export function DeviceCircuitDemo({ kind }: { kind: DeviceKind }) {
  const makeCircuit = useCallback(() => deviceDemo(kind), [kind]);
  const initialFocus = [
    "address",
    "data",
    "we",
    "clock",
    ["bank", "vram", "big-blitter"].includes(kind) ? "big-screen" : "screen",
  ];
  return (
    <CircuitDemo
      makeCircuit={makeCircuit}
      label={`${kind} circuit bench`}
      initialFocus={initialFocus}
    >
      <p>{LESSONS[kind]}</p>
      <p>
        Set ADDRESS and DATA on the canvas. Turn WRITE ENABLE on, then step through a rising clock
        edge to store. Turn WRITE ENABLE off before reading or running the device. Open a block to
        follow its gates, or edit the wiring.
      </p>
    </CircuitDemo>
  );
}
