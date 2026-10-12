import clsx from "clsx";
import { useCallback, useMemo, useReducer, useState } from "react";
import { blankFrame, rowBytes } from "../../lib/computer/video";
import {
  BIG_BLIT,
  BIG_BLIT_COMMANDS,
  BIG_FRAME_BYTES,
  BIG_SCREEN,
  type BigBlitter,
  bigBlitterClock,
  bigBlitterData,
  blitColumns,
  blitRows,
  byteBits,
  describeBigBlitter,
  hex,
  initialBigBlitter,
} from "../../lib/computerStepper";
import {
  BlitterStatus,
  buttonClass,
  byteWhere,
  ClickLayer,
  ClockControls,
  captionClass,
  hintClass,
  LastStore,
  noteClass,
  readoutClass,
  Slider,
  useClock,
} from "./DeviceDemoParts";
import { ScreenGrid } from "./ScreenGrid";

type Register = keyof typeof BIG_BLIT;
type Command = keyof typeof BIG_BLIT_COMMANDS;
const COMMANDS = Object.keys(BIG_BLIT_COMMANDS) as Command[];
const BYTES = Array.from({ length: BIG_FRAME_BYTES }, (_, byte) => byte);
/** LED side in px. A byte's cell in the click layer is 8 LEDs wide and one high. */
const PIXEL = 9;
const SMILEY = [60, 66, 165, 129, 165, 153, 66, 60];
/** The demo opens ready to copy the smiley in the top left corner to this byte. */
const START_DST = 46;
const TICK_MS = 120;

/** SIZE for a rectangle: rows − 1 in bits 2–6, byte columns − 1 in bits 0–1. */
const sizeByte = (columns: number, rows: number) => ((rows - 1) << 2) | (columns - 1);
const address = (register: Register) => hex(BIG_BLIT[register]);
const bytesOf = (count: number) => `${count} byte${count === 1 ? "" : "s"}`;

/** The big blitter after a store to one of its registers: the card decodes A0–A1. */
const stored = (blitter: BigBlitter, register: Register, value: number) =>
  bigBlitterClock(blitter, { register: BIG_BLIT[register] & 3, value });

type State = {
  blitter: BigBlitter;
  frame: readonly number[];
  /** Clock ticks since the reset. The CPU counter shows the same number. */
  ticks: number;
  /** The byte the last tick wrote. */
  written: number | null;
  store: string;
};
type Action =
  | { type: "store"; register: Register; value: number; text: string; note?: string }
  | { type: "tick" }
  | { type: "reset" };

function start(): State {
  const frame = blankFrame(BIG_SCREEN);
  SMILEY.forEach((row, y) => {
    frame[y * rowBytes(BIG_SCREEN)] = row;
  });
  const size = sizeByte(1, SMILEY.length);
  return {
    blitter: stored(stored(initialBigBlitter(), "dst", START_DST), "size", size),
    frame,
    ticks: 0,
    written: null,
    store: `STM ${address("dst")} ← ${START_DST}, STM ${address("src")} ← 0, STM ${address("size")} ← ${hex(size)}`,
  };
}

function reduce(state: State, action: Action): State {
  if (action.type === "reset") return start();
  const { blitter, frame } = state;
  if (action.type === "store") {
    if (blitter.busy)
      return { ...state, store: `${action.text}: ignored, the big blitter is BUSY` };
    return {
      ...state,
      blitter: stored(blitter, action.register, action.value),
      store: action.note ? `${action.text}: ${action.note}` : action.text,
    };
  }
  // One clock edge: a busy blitter writes the byte at its destination, then moves on.
  const ticks = state.ticks + 1;
  if (!blitter.busy) return { ...state, ticks };
  const byte = blitter.dptr;
  const value = bigBlitterData(blitter, frame);
  return {
    ...state,
    ticks,
    blitter: bigBlitterClock(blitter, null),
    frame: frame.map((old, index) => (index === byte ? value : old)),
    written: byte,
  };
}

/**
 * The bytes command `op` writes and reads with the registers as they are, in
 * order. It runs the device ahead, so the outlines cannot disagree with it.
 */
function path(blitter: BigBlitter, op: number): { dst: number[]; src: number[] } {
  const dst: number[] = [];
  const src: number[] = [];
  let at = stored({ ...blitter, busy: false }, "cmd", op);
  while (at.busy) {
    dst.push(at.dptr);
    src.push(at.sptr);
    at = bigBlitterClock(at, null);
  }
  return { dst, src };
}

type Cell = { kind: "dst" | "src"; top: boolean; bottom: boolean; left: boolean; right: boolean };

/** Marks the edges of a rectangle of `bytes`, `columns` wide, in `cells`. */
function outline(cells: Map<number, Cell>, bytes: number[], columns: number, kind: Cell["kind"]) {
  const rows = bytes.length / columns;
  bytes.forEach((byte, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    cells.set(byte, {
      kind,
      top: row === 0,
      bottom: row === rows - 1,
      left: column === 0,
      right: column === columns - 1,
    });
  });
}

/**
 * The big blitter, without a CPU: DST, SRC and SIZE at DC–DE set by hand, a
 * FILL or COPY to start at DF, and a clock to step. It writes one byte of the
 * 32×32 screen per tick; the counter beside it adds 1 on every tick, as a CPU
 * that runs on would.
 */
export function BigBlitterDemo() {
  const [state, dispatch] = useReducer(reduce, undefined, start);
  const [command, setCommand] = useState<Command>("copy");
  /** The register a click on the screen sets. FILL has no source rectangle. */
  const [pick, setPick] = useState<"dst" | "src">("dst");
  const [playing, setPlaying] = useState(false);
  const tick = useCallback(() => dispatch({ type: "tick" }), []);
  useClock(playing, tick, TICK_MS);

  const { blitter } = state;
  const columns = blitColumns(blitter.size);
  const rows = blitRows(blitter.size);
  const total = columns * rows;
  const source = blitter.src & (BIG_FRAME_BYTES - 1);
  // While a command runs, the outlines show that command, whatever the picker says.
  const op = blitter.busy ? blitter.op : BIG_BLIT_COMMANDS[command];
  const copying = op === BIG_BLIT_COMMANDS.copy;
  const target = command === "copy" ? pick : "dst";
  const cells = useMemo(() => {
    const { dst, src } = path(blitter, op);
    const next = new Map<number, Cell>();
    if (op === BIG_BLIT_COMMANDS.copy) outline(next, src, blitColumns(blitter.size), "src");
    outline(next, dst, blitColumns(blitter.size), "dst");
    return next;
  }, [blitter, op]);

  const store = (register: Register, value: number, shown = String(value), note?: string) =>
    dispatch({
      type: "store",
      register,
      value,
      text: `STM ${address(register)} ← ${shown}`,
      note,
    });
  const storeSrc = (value: number) =>
    store("src", value, command === "fill" ? hex(value) : String(value));
  const storeSize = (nextColumns: number, nextRows: number) => {
    const size = sizeByte(nextColumns, nextRows);
    store("size", size, hex(size));
  };

  return (
    <section className="not-prose flow-para" aria-label="Big blitter demo">
      <div className="flex flex-wrap items-start gap-group">
        <figure className="flow-label">
          <figcaption className={captionClass}>Big screen: 32×32 pixels, 128 bytes</figcaption>
          <div className="relative w-max">
            <ScreenGrid rows={state.frame} size={BIG_SCREEN} label="Big screen" pixel={PIXEL} />
            <ClickLayer columns={rowBytes(BIG_SCREEN)} rows={BIG_SCREEN.height}>
              {BYTES.map((byte) => {
                const cell = cells.get(byte);
                return (
                  <button
                    key={byte}
                    type="button"
                    aria-label={`Byte ${byte}`}
                    data-rect={cell?.kind}
                    data-written={byte === state.written || undefined}
                    onClick={() => (target === "dst" ? store("dst", byte) : storeSrc(byte))}
                    className={clsx(
                      "cursor-pointer hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 data-[written]:shadow-[inset_0_0_0_1px_#ffd84d]",
                      cell?.kind === "dst" && "border-cyan-300",
                      cell?.kind === "src" && "border-amber-300",
                      cell?.top && "border-t-2",
                      cell?.bottom && "border-b-2",
                      cell?.left && "border-l-2",
                      cell?.right && "border-r-2",
                      blitter.busy && byte === blitter.dptr && "bg-cyan-300/40",
                      blitter.busy && copying && byte === blitter.sptr && "bg-amber-300/40",
                    )}
                  />
                );
              })}
            </ClickLayer>
          </div>
          <p className={hintClass}>
            Each row is 4 bytes of 8 pixels. Click a byte to move a rectangle's top left corner
            there. The blue rectangle is DST, the orange one SRC.
          </p>
        </figure>

        <BlitterStatus
          name="Big blitter"
          status={describeBigBlitter(blitter)}
          busy={blitter.busy}
          ticks={state.ticks}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-group gap-y-tight">
        <fieldset className="m-0 flex flex-wrap items-center gap-tight border-0 p-0">
          <legend className="sr-only">Command</legend>
          {COMMANDS.map((name) => (
            <button
              key={name}
              type="button"
              className={buttonClass}
              aria-pressed={name === command}
              onClick={() => setCommand(name)}
            >
              {name.toUpperCase()}
            </button>
          ))}
        </fieldset>
        <fieldset className="m-0 flex flex-wrap items-center gap-tight border-0 p-0 text-sm text-gray-800 dark:text-gray-200">
          <legend className="sr-only">A click on the screen sets</legend>
          <span>A click sets</span>
          <button
            type="button"
            className={buttonClass}
            aria-pressed={target === "dst"}
            onClick={() => setPick("dst")}
          >
            DST
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-pressed={target === "src"}
            disabled={command === "fill"}
            onClick={() => setPick("src")}
          >
            SRC
          </button>
        </fieldset>
      </div>

      <div className="flow-tight">
        <Slider
          name="DST"
          max={BIG_FRAME_BYTES - 1}
          value={blitter.dst}
          onChange={(value) => store("dst", value)}
        >
          DST ({address("dst")}) = {blitter.dst}: {byteWhere(blitter.dst)}
        </Slider>
        <Slider name="SRC" max={255} value={blitter.src} onChange={storeSrc}>
          {command === "fill"
            ? `SRC (${address("src")}) = ${hex(blitter.src)} = ${byteBits(blitter.src)}: the byte FILL writes`
            : `SRC (${address("src")}) = ${blitter.src}: copy from byte ${source}, ${byteWhere(source)}`}
        </Slider>
        <Slider
          name="Columns"
          label="SIZE columns"
          min={1}
          max={rowBytes(BIG_SCREEN)}
          value={columns}
          onChange={(value) => storeSize(value, rows)}
        />
        <Slider
          name="Rows"
          label="SIZE rows"
          min={1}
          max={BIG_SCREEN.height}
          value={rows}
          onChange={(value) => storeSize(columns, value)}
        />
        <output aria-label="SIZE" className={clsx("block", readoutClass)}>
          SIZE ({address("size")}) = {hex(blitter.size)}: {columns * 8} × {rows} pixels,{" "}
          {bytesOf(total)}
        </output>
      </div>

      <div className="flex flex-wrap items-center gap-tight">
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            store(
              "cmd",
              BIG_BLIT_COMMANDS[command],
              undefined,
              `${command.toUpperCase()} starts, ${bytesOf(total)}, one per tick`,
            )
          }
        >
          Start {command.toUpperCase()}
        </button>
      </div>

      <ClockControls
        playing={playing}
        onStep={tick}
        onPlay={() => setPlaying(!playing)}
        onReset={() => {
          setPlaying(false);
          dispatch({ type: "reset" });
        }}
      />

      <LastStore>{state.store}</LastStore>

      <p className={noteClass}>
        The big blitter works on whole bytes of the 32×32 screen. DST ({address("dst")}) and SRC (
        {address("src")}) are byte numbers: row × 4 + byte column. SIZE ({address("size")}) packs
        the rectangle into one byte: rows − 1 in bits 2 to 6, byte columns − 1 in bits 0 and 1. A
        store to {address("cmd")} starts a command. FILL writes the SRC value itself into every byte
        of the DST rectangle. COPY reads the rectangle at SRC and writes it at DST. Each clock tick
        moves one byte. While BUSY reads 1, the blitter ignores stores to {address("dst")} to{" "}
        {address("cmd")}. The CPU counter adds 1 on every tick. It stands for the CPU's own program,
        which runs on while the blitter works.
      </p>
    </section>
  );
}
