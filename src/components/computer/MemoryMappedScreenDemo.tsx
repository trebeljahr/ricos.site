import { useState } from "react";
import { byteBits, hex, SCREEN_BASE } from "../../lib/computerStepper";
import {
  buttonClass,
  ClickLayer,
  captionClass,
  hintClass,
  LastStore,
  LED_PITCH,
  LED_SIZE_CLASS,
  noteClass,
  RowLines,
  Slider,
} from "./DeviceDemoParts";
import { ScreenGrid } from "./ScreenGrid";

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
const SMILEY = [60, 66, 165, 129, 165, 153, 66, 60];
const BLANK = Array<number>(8).fill(0);

/** The data address of screen row `row`. */
const address = (row: number) => hex(SCREEN_BASE + row);

/**
 * The memory-mapped screen, without a CPU: 8 bytes at F0–F7, one per row of
 * the 8×8 screen. Click a pixel to flip one bit of its row's byte, or pick a
 * row and store any byte in it.
 */
export function MemoryMappedScreenDemo() {
  const [rows, setRows] = useState<readonly number[]>(SMILEY);
  /** The row the byte slider stores to. */
  const [row, setRow] = useState(3);
  const [written, setWritten] = useState<number | null>(null);
  const [store, setStore] = useState(`8 stores, ${address(0)} to ${address(7)}: a smiley`);

  function storeRow(y: number, value: number) {
    setRows(rows.map((old, index) => (index === y ? value : old)));
    setRow(y);
    setWritten(y);
    setStore(`STM ${address(y)} ← ${hex(value)}: row ${y} is now ${byteBits(value)}`);
  }

  function storeAll(values: readonly number[], what: string) {
    setRows(values);
    setWritten(null);
    setStore(`8 stores, ${address(0)} to ${address(7)}: ${what}`);
  }

  return (
    <section className="not-prose flow-para" aria-label="Memory-mapped screen demo">
      <figure className="flow-label">
        <figcaption className={captionClass}>
          Screen: 8×8 pixels, 8 bytes at {address(0)} to {address(7)}
        </figcaption>
        <div className={`flex items-start gap-stack ${LED_SIZE_CLASS}`}>
          <div>
            {/* The bit number of each column, over its LEDs. */}
            <div
              aria-hidden="true"
              className="grid h-5 items-center px-[5.5px] text-center font-mono text-[10px] text-gray-500 dark:text-gray-400"
              style={{ gridTemplateColumns: `repeat(8, ${LED_PITCH})` }}
            >
              {ROWS.map((bit) => (
                <span key={bit}>{bit}</span>
              ))}
            </div>
            <div className="relative w-max">
              <ScreenGrid
                rows={rows}
                label="Screen"
                written={written === null ? null : { x: null, y: written }}
              />
              <ClickLayer columns={8}>
                {ROWS.flatMap((y) =>
                  ROWS.map((bit) => (
                    <button
                      key={`${y}-${bit}`}
                      type="button"
                      aria-label={`${address(y)} bit ${bit}`}
                      aria-pressed={Boolean((rows[y] >> bit) & 1)}
                      onClick={() => storeRow(y, rows[y] ^ (1 << bit))}
                      className="aspect-square cursor-pointer rounded-sm hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    />
                  )),
                )}
              </ClickLayer>
            </div>
          </div>
          <div>
            <div
              aria-hidden="true"
              className="flex h-5 items-center font-mono text-[10px] text-gray-500 dark:text-gray-400"
            >
              ← bit
            </div>
            <RowLines label="Screen addresses" pitch={LED_PITCH}>
              {ROWS.map((y) => (
                <li key={y} className="m-0 flex p-0">
                  <button
                    type="button"
                    aria-pressed={y === row}
                    onClick={() => setRow(y)}
                    className="flex cursor-pointer items-center whitespace-nowrap rounded-sm px-1 hover:text-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 aria-pressed:bg-cyan-100 aria-pressed:text-cyan-800 dark:hover:text-cyan-300 dark:aria-pressed:bg-cyan-950 dark:aria-pressed:text-cyan-200"
                  >
                    {address(y)} = {hex(rows[y])} = {byteBits(rows[y])}
                  </button>
                </li>
              ))}
            </RowLines>
          </div>
        </div>
        <p className={hintClass}>
          Click a pixel to flip one bit of its row's byte. Bit 0 is the left pixel, so a row is its
          binary number mirrored.
        </p>
      </figure>

      <Slider
        name="Byte"
        label="Row byte"
        max={255}
        value={rows[row]}
        onChange={(value) => storeRow(row, value)}
      >
        {address(row)} = {hex(rows[row])} = {byteBits(rows[row])} = {rows[row]} in decimal
      </Slider>

      <div className="flex flex-wrap items-center gap-tight">
        <button type="button" className={buttonClass} onClick={() => storeAll(SMILEY, "a smiley")}>
          Store a smiley
        </button>
        <button type="button" className={buttonClass} onClick={() => storeAll(BLANK, "zeros")}>
          Clear the screen
        </button>
      </div>

      <LastStore>{store}</LastStore>

      <p className={noteClass}>
        The screen is 8 bytes of memory. Each address from {address(0)} to {address(7)} holds one
        row, and each bit of the byte is one pixel. The CPU has no drawing instruction. STM{" "}
        {address(3)} stores the accumulator in row 3 the way STM 03 stores it in RAM. The address
        decides where the byte lands: {address(0)} to {address(7)} reach the screen instead of RAM.
        Click a line beside the screen to pick its row, then move the slider: every value from 0 to
        255 is a different row of pixels.
      </p>
    </section>
  );
}
