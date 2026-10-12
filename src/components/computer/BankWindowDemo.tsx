import { type ReactNode, useState } from "react";
import { blankFrame, litPixels } from "../../lib/computer/video";
import { BIG_PORT, BIG_SCREEN, BIG_TILES, hex, windowByte } from "../../lib/computerStepper";
import { ScreenGrid } from "./ScreenGrid";

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
const TILES = Array.from({ length: BIG_TILES }, (_, tile) => tile);
const SMILEY = [60, 66, 165, 129, 165, 153, 66, 60];
/** LED sides in px. One LED and its 1px gutter are one cell of the click layers below. */
const BIG_PIXEL = 8;
const WINDOW_PIXEL = 22;
/** The tile the demo opens on: second row, second column, already holding a smiley. */
const START_BANK = 5;

const buttonClass =
  "rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-800 hover:border-cyan-500 hover:text-cyan-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300";
const captionClass = "text-sm font-semibold text-gray-800 dark:text-gray-200";

/** BANK's column and row of tiles: bits 0–1 and bits 2–3. */
const tileColumn = (bank: number) => bank & 3;
const tileRow = (bank: number) => bank >> 2;

/** `frame` after one store to window address D0 + `row` while BANK is `bank`. */
function storeRow(frame: readonly number[], bank: number, row: number, value: number): number[] {
  const next = [...frame];
  next[windowByte(bank, row)] = value & 255;
  return next;
}

/** `frame` after stores to all 8 window addresses. */
const storeRows = (frame: readonly number[], bank: number, values: readonly number[]) =>
  values.reduce((next, value, row) => storeRow(next, bank, row, value), [...frame]);

/**
 * A layer of buttons over a ScreenGrid, one per cell. The grid's LEDs start
 * 6px in (its border and padding) and have 1px gutters; half a gutter further
 * out, `columns` equal cells of the layer line up with the LEDs under them.
 */
function ClickLayer({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <div
      className="absolute inset-[5.5px] grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {children}
    </div>
  );
}

/**
 * The big screen's bank window, without a CPU: a 32×32 screen of 128 bytes,
 * the 8 addresses D0–D7 that reach it, and the BANK register that says which
 * 8×8 tile they reach. Click a tile to set BANK; click window pixels to store
 * a row byte.
 */
export function BankWindowDemo() {
  const [frame, setFrame] = useState(() => storeRows(blankFrame(BIG_SCREEN), START_BANK, SMILEY));
  const [bank, setBank] = useState(START_BANK);
  const [store, setStore] = useState(`STM ${hex(BIG_PORT.bank)} ← ${START_BANK}`);
  const rows = ROWS.map((row) => frame[windowByte(bank, row)]);

  function chooseBank(next: number) {
    setBank(next);
    setStore(`STM ${hex(BIG_PORT.bank)} ← ${next}`);
  }

  function togglePixel(row: number, bit: number) {
    const value = rows[row] ^ (1 << bit);
    setFrame(storeRow(frame, bank, row, value));
    setStore(
      `STM ${hex(BIG_PORT.window + row)} ← ${hex(value)}, which lands in big-screen byte ${windowByte(bank, row)}`,
    );
  }

  function storeAll(values: readonly number[], what: string) {
    setFrame(storeRows(frame, bank, values));
    setStore(
      `8 stores, ${hex(BIG_PORT.window)} to ${hex(BIG_PORT.window + 7)}: ${what} in tile ${bank}`,
    );
  }

  return (
    <section className="not-prose flow-para" aria-label="Bank window demo">
      <div className="flex flex-wrap items-start gap-group">
        <figure className="flow-label">
          <figcaption className={captionClass}>Big screen: 32×32 pixels, 128 bytes</figcaption>
          <div className="relative w-max">
            <ScreenGrid rows={frame} size={BIG_SCREEN} label="Big screen" pixel={BIG_PIXEL} />
            <ClickLayer columns={4}>
              {TILES.map((tile) => (
                <button
                  key={tile}
                  type="button"
                  aria-label={`Tile ${tile}`}
                  aria-pressed={tile === bank}
                  onClick={() => chooseBank(tile)}
                  className="aspect-square cursor-pointer border border-cyan-300/15 hover:border-cyan-300/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 aria-pressed:border-2 aria-pressed:border-cyan-300"
                />
              ))}
            </ClickLayer>
          </div>
          <p className="max-w-72 text-xs text-gray-600 dark:text-gray-400">
            16 tiles of 8×8 pixels. Click a tile to point the window at it.
          </p>
        </figure>

        <figure className="flow-label">
          <figcaption className={captionClass}>
            Window: addresses {hex(BIG_PORT.window)} to {hex(BIG_PORT.window + 7)}
          </figcaption>
          <div className="flex items-start gap-stack">
            <div className="relative w-max">
              <ScreenGrid rows={rows} label="Window" pixel={WINDOW_PIXEL} />
              <ClickLayer columns={8}>
                {ROWS.flatMap((row) =>
                  ROWS.map((bit) => (
                    <button
                      key={`${row}-${bit}`}
                      type="button"
                      aria-label={`${hex(BIG_PORT.window + row)} bit ${bit}`}
                      aria-pressed={Boolean((rows[row] >> bit) & 1)}
                      onClick={() => togglePixel(row, bit)}
                      className="aspect-square cursor-pointer rounded-sm hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    />
                  )),
                )}
              </ClickLayer>
            </div>
            {/* One line per window row, at the LED pitch, so each sits beside its row. */}
            <ol
              aria-label="Window addresses"
              className="m-0 grid list-none p-0 pt-[6px] font-mono text-xs text-gray-800 dark:text-gray-200"
              style={{ gridAutoRows: `${WINDOW_PIXEL + 1}px` }}
            >
              {ROWS.map((row) => (
                <li key={row} className="m-0 flex items-center whitespace-nowrap p-0">
                  {hex(BIG_PORT.window + row)} = {hex(rows[row])} → byte {windowByte(bank, row)}
                </li>
              ))}
            </ol>
          </div>
          <p className="max-w-72 text-xs text-gray-600 dark:text-gray-400">
            Click a pixel to store that row's byte. Bit 0 is the left pixel.
          </p>
        </figure>
      </div>

      <div className="flex flex-wrap items-center gap-stack">
        <label className="flex items-center gap-tight text-sm text-gray-800 dark:text-gray-200">
          BANK
          <input
            type="range"
            min={0}
            max={BIG_TILES - 1}
            value={bank}
            onChange={(event) => chooseBank(Number(event.target.value))}
            aria-label="BANK register"
            className="w-40"
          />
        </label>
        <output aria-label="Bank" className="font-mono text-sm text-gray-800 dark:text-gray-200">
          BANK ({hex(BIG_PORT.bank)}) = {bank} = {bank.toString(2).padStart(4, "0")}: tile row{" "}
          {tileRow(bank)}, tile column {tileColumn(bank)}
        </output>
      </div>

      <div className="flex flex-wrap items-center gap-tight">
        <button type="button" className={buttonClass} onClick={() => storeAll(SMILEY, "a smiley")}>
          Store a smiley
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => storeAll(Array(8).fill(0), "zeros")}
        >
          Clear the window
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={litPixels(frame) === 0}
          onClick={() => {
            setFrame(blankFrame(BIG_SCREEN));
            setStore("Screen cleared");
          }}
        >
          Clear the screen
        </button>
      </div>

      <p className="font-mono text-sm text-gray-800 dark:text-gray-200">
        Last store:{" "}
        <output aria-label="Last store" aria-live="polite">
          {store}
        </output>
      </p>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        The window is 8 addresses, and each one reaches one byte: 8 pixels of one row. BANK is a
        ninth address, {hex(BIG_PORT.bank)}. Its low 2 bits are the tile's column and the next 2
        bits its row. The byte a window address reaches is (tile row × 8 + window row) × 4 + tile
        column. A program that draws 8 rows draws them on any tile: it stores BANK once, then the
        same 8 addresses.
      </p>
    </section>
  );
}
