import { useState } from "react";
import { byteBits, hex, PIXEL_PORT, plotRow, SCREEN_BASE } from "../../lib/computerStepper";
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
/** The cursor the demo opens on: a dark pixel in a row that has two lit ones. */
const START = { x: 3, y: 3 };

const X = hex(PIXEL_PORT.x);
const Y = hex(PIXEL_PORT.y);
const PIXEL = hex(PIXEL_PORT.pixel);

/** "goes from 81 to 89", or "stays 89" when the store changed nothing. */
const change = (before: number, after: number) =>
  before === after ? `stays ${hex(after)}` : `goes from ${hex(before)} to ${hex(after)}`;

/**
 * The pixel port, without a CPU: a cursor in F8 and F9, and a store to FA
 * that changes the one pixel under it. Beside it, the store a program has
 * without the port: a whole row byte, which replaces all 8 pixels.
 */
export function PixelPortDemo() {
  const [rows, setRows] = useState<readonly number[]>(SMILEY);
  const [cursor, setCursor] = useState(START);
  const [written, setWritten] = useState<{ x: number | null; y: number } | null>(null);
  const [store, setStore] = useState(`STM ${X} ← ${START.x}, STM ${Y} ← ${START.y}`);
  const { x, y } = cursor;
  /** The row byte that lights the cursor's pixel and nothing else. */
  const rowByte = 1 << x;

  function moveCursor(next: { x: number; y: number }, text: string) {
    setCursor(next);
    setWritten(null);
    setStore(text);
  }

  function storeTo(row: number, value: number, wrote: { x: number | null; y: number }) {
    setRows(rows.map((old, index) => (index === row ? value : old)));
    setWritten(wrote);
  }

  function plot(colour: number) {
    const next = plotRow(rows[y], x, colour);
    storeTo(y, next, { x, y });
    setStore(
      `STM ${PIXEL} ← ${colour}: pixel ${x}, ${y} is ${colour ? "lit" : "dark"}, row ${y} ${change(rows[y], next)}`,
    );
  }

  function storeRowByte() {
    storeTo(y, rowByte, { x: null, y });
    setStore(
      `STM ${hex(SCREEN_BASE + y)} ← ${hex(rowByte)}: all 8 pixels of row ${y} replaced, row ${y} ${change(rows[y], rowByte)}`,
    );
  }

  return (
    <section className="not-prose flow-para" aria-label="Pixel port demo">
      <figure className="flow-label">
        <figcaption className={captionClass}>Screen: 8×8 pixels, with the port's cursor</figcaption>
        <div className={`flex items-start gap-stack ${LED_SIZE_CLASS}`}>
          <div className="relative w-max">
            <ScreenGrid rows={rows} label="Screen" written={written} />
            <ClickLayer columns={8}>
              {ROWS.flatMap((row) =>
                ROWS.map((column) => (
                  <button
                    key={`${column}-${row}`}
                    type="button"
                    aria-label={`Pixel ${column}, ${row}`}
                    aria-pressed={column === x && row === y}
                    onClick={() =>
                      moveCursor(
                        { x: column, y: row },
                        `STM ${X} ← ${column}, STM ${Y} ← ${row}: the cursor is at x ${column}, y ${row}`,
                      )
                    }
                    className="aspect-square cursor-pointer rounded-sm hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-cyan-300"
                  />
                )),
              )}
            </ClickLayer>
          </div>
          <RowLines label="Screen addresses" pitch={LED_PITCH}>
            {ROWS.map((row) => (
              <li
                key={row}
                aria-current={row === y || undefined}
                className="m-0 flex items-center whitespace-nowrap p-0 aria-[current]:font-bold aria-[current]:text-cyan-700 dark:aria-[current]:text-cyan-300"
              >
                {hex(SCREEN_BASE + row)} = {hex(rows[row])} = {byteBits(rows[row])}
              </li>
            ))}
          </RowLines>
        </div>
        <p className={hintClass}>
          Click a pixel to move the cursor there. The outlined pixel is the cursor.
        </p>
      </figure>

      <div className="flow-tight">
        <Slider
          name="X"
          max={7}
          value={x}
          onChange={(next) => moveCursor({ x: next, y }, `STM ${X} ← ${next}`)}
        >
          X ({X}) = {x}
        </Slider>
        <Slider
          name="Y"
          max={7}
          value={y}
          onChange={(next) => moveCursor({ x, y: next }, `STM ${Y} ← ${next}`)}
        >
          Y ({Y}) = {y}
        </Slider>
      </div>

      <div className="flow-tight">
        <p className={captionClass}>Through the port: one pixel</p>
        <div className="flex flex-wrap items-center gap-tight">
          <button type="button" className={buttonClass} onClick={() => plot(1)}>
            Store 1 in {PIXEL}
          </button>
          <button type="button" className={buttonClass} onClick={() => plot(0)}>
            Store 0 in {PIXEL}
          </button>
        </div>
      </div>

      <div className="flow-tight">
        <p className={captionClass}>Without the port: a whole row</p>
        <div className="flex flex-wrap items-center gap-tight">
          <button type="button" className={buttonClass} onClick={storeRowByte}>
            Store {hex(rowByte)} in {hex(SCREEN_BASE + y)}
          </button>
        </div>
      </div>

      <LastStore>{store}</LastStore>

      <p className={noteClass}>
        A store to a row address writes a whole byte: all 8 pixels of the row. To light one pixel
        that way and keep the other 7, a program must first work out the whole row byte. The pixel
        port does that work in hardware. It keeps a cursor: {X} holds x and {Y} holds y, 3 bits
        each. A store to {PIXEL} takes the row at y, sets bit x to bit 0 of the stored value, and
        writes the row back. The other 7 pixels stay as they are. In the source language, plot(x, y)
        is those three stores.
      </p>
    </section>
  );
}
