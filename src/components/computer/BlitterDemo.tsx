import { useCallback, useReducer, useState } from "react";
import {
  BLIT_COMMANDS,
  BLITTER_PORT,
  type BlitCommand,
  type BlitterState,
  blitterClock,
  blitterColumn,
  blitterData,
  blitterLast,
  blitterRow,
  blitterSource,
  byteBits,
  describeBlitter,
  hex,
  initialBlitter,
} from "../../lib/computerStepper";
import {
  BlitterStatus,
  buttonClass,
  ClockControls,
  captionClass,
  hintClass,
  LastStore,
  LED_SIZE_CLASS,
  noteClass,
  Slider,
  useClock,
} from "./DeviceDemoParts";
import { ScreenGrid } from "./ScreenGrid";

type Register = keyof typeof BLITTER_PORT;
const COMMANDS = Object.keys(BLIT_COMMANDS) as BlitCommand[];
const BLANK = Array<number>(8).fill(0);
const HEART = [102, 255, 255, 255, 126, 60, 24, 0];
const SMILEY = [60, 66, 165, 129, 165, 153, 66, 60];
/** The bytes SPRITE reads: ARG is an address in here. Every later ROM byte is 00. */
const SPRITE_ROM = [...HEART, ...SMILEY];
const TICK_MS = 250;

type State = {
  blitter: BlitterState;
  screen: readonly number[];
  /** Clock ticks since the reset. The CPU counter shows the same number. */
  ticks: number;
  written: { x: number | null; y: number } | null;
  store: string;
};
type Action =
  | { type: "store"; register: Register; value: number; text: string; note?: string }
  | { type: "tick" }
  | { type: "reset" };

/** The blitter after a store to one of its registers: the port decodes A0–A2. */
const stored = (blitter: BlitterState, register: Register, value: number) =>
  blitterClock(blitter, { register: BLITTER_PORT[register] & 7, value });

const start = (): State => ({
  blitter: stored(initialBlitter(), "colour", 255),
  screen: BLANK,
  ticks: 0,
  written: null,
  store: `STM ${hex(BLITTER_PORT.colour)} ← FF`,
});

function reduce(state: State, action: Action): State {
  if (action.type === "reset") return start();
  const { blitter, screen } = state;
  if (action.type === "store") {
    if (blitter.busy) return { ...state, store: `${action.text}: ignored, the blitter is BUSY` };
    return {
      ...state,
      blitter: stored(blitter, action.register, action.value),
      store: action.note ? `${action.text}: ${action.note}` : action.text,
    };
  }
  // One clock edge: a busy blitter writes this step's row, then moves on a step.
  const ticks = state.ticks + 1;
  if (!blitter.busy) return { ...state, ticks };
  const y = blitterRow(blitter);
  const row = blitterData(blitter, screen[y], SPRITE_ROM[blitterSource(blitter)] ?? 0);
  return {
    ...state,
    ticks,
    blitter: blitterClock(blitter, null),
    screen: screen.map((old, index) => (index === y ? row : old)),
    written: { x: blitterColumn(blitter), y },
  };
}

const ticksOf = (count: number) => `${count} tick${count === 1 ? "" : "s"}`;

/** What `command` does with the registers as they are now, and how many ticks it takes. */
function plan(command: BlitCommand, blitter: BlitterState): string {
  const { x, y, colour, arg } = blitter;
  const steps = blitterLast({ ...blitter, op: BLIT_COMMANDS[command] }) + 1;
  const pixels = `${steps} pixel${steps === 1 ? "" : "s"}`;
  const what = {
    clear: `COLOUR ${hex(colour)} into all 8 rows`,
    fill: `COLOUR ${hex(colour)} into row ${y}`,
    hline: `${pixels} to the right from x ${x}, y ${y}, in colour ${colour & 1}`,
    vline: `${pixels} down from x ${x}, y ${y}, in colour ${colour & 1}`,
    pixel: `the pixel at x ${x}, y ${y}, in colour ${colour & 1}`,
    sprite: `ROM bytes ${hex(arg)} to ${hex((arg + 7) & 255)} into rows ${y === 0 ? "0 to 7" : `${y} to 7, then 0 to ${y - 1}`}`,
  }[command];
  return `${command.toUpperCase()}: ${what}. ${ticksOf(steps)}.`;
}

/**
 * The blitter, without a CPU: five registers at E0–E4 set by hand, a command
 * to start, and a clock to step. The blitter draws one row or pixel per tick;
 * the counter beside it adds 1 on every tick, as a CPU that runs on would.
 */
export function BlitterDemo() {
  const [state, dispatch] = useReducer(reduce, undefined, start);
  const [command, setCommand] = useState<BlitCommand>("sprite");
  const [playing, setPlaying] = useState(false);
  const tick = useCallback(() => dispatch({ type: "tick" }), []);
  useClock(playing, tick, TICK_MS);
  const { blitter } = state;

  const store = (register: Register, value: number, shown = String(value), note?: string) =>
    dispatch({
      type: "store",
      register,
      value,
      text: `STM ${hex(BLITTER_PORT[register])} ← ${shown}`,
      note,
    });

  return (
    <section className="not-prose flow-para" aria-label="Blitter demo">
      <div className="flex flex-wrap items-start gap-group">
        <figure className={`flow-label ${LED_SIZE_CLASS}`}>
          <figcaption className={captionClass}>Screen: 8×8 pixels</figcaption>
          <ScreenGrid rows={state.screen} label="Screen" written={state.written} />
          <p className={hintClass}>
            The yellow outline is what the blitter wrote on the last tick.
          </p>
        </figure>

        <div className="flow-para">
          <BlitterStatus
            name="Blitter"
            status={describeBlitter(blitter)}
            busy={blitter.busy}
            ticks={state.ticks}
          />
          <figure className="flow-label">
            <figcaption className={captionClass}>Sprite ROM</figcaption>
            <div className="flex flex-wrap gap-stack [--pixel-size:6px]">
              <div className="flow-tight">
                <ScreenGrid rows={HEART} label="ROM heart" />
                <p className={hintClass}>00 to 07</p>
              </div>
              <div className="flow-tight">
                <ScreenGrid rows={SMILEY} label="ROM smiley" />
                <p className={hintClass}>08 to 0F</p>
              </div>
            </div>
          </figure>
        </div>
      </div>

      <div className="flow-tight">
        <Slider name="X" max={7} value={blitter.x} onChange={(value) => store("x", value)}>
          X ({hex(BLITTER_PORT.x)}) = {blitter.x}
        </Slider>
        <Slider name="Y" max={7} value={blitter.y} onChange={(value) => store("y", value)}>
          Y ({hex(BLITTER_PORT.y)}) = {blitter.y}
        </Slider>
        <Slider
          name="COLOUR"
          max={255}
          value={blitter.colour}
          onChange={(value) => store("colour", value, hex(value))}
        >
          COLOUR ({hex(BLITTER_PORT.colour)}) = {hex(blitter.colour)} = {byteBits(blitter.colour)}
        </Slider>
        <Slider name="ARG" max={15} value={blitter.arg} onChange={(value) => store("arg", value)}>
          ARG ({hex(BLITTER_PORT.arg)}) = {blitter.arg}
        </Slider>
      </div>

      <div className="flow-label">
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
        <p className={noteClass}>
          <output aria-label="Command">{plan(command, blitter)}</output>
        </p>
        <div className="flex flex-wrap items-center gap-tight">
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              store(
                "cmd",
                BLIT_COMMANDS[command],
                undefined,
                `${command.toUpperCase()} starts on the next tick`,
              )
            }
          >
            Start {command.toUpperCase()}
          </button>
        </div>
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
        The blitter has five registers at {hex(BLITTER_PORT.x)} to {hex(BLITTER_PORT.cmd)}. A store
        to CMD ({hex(BLITTER_PORT.cmd)}) starts a command. From then on the blitter writes one row
        or one pixel on each clock tick, by itself. While it works, BUSY reads 1 and the blitter
        ignores stores to its registers. The CPU counter adds 1 on every tick. It stands for the
        CPU's own program, which runs on while the blitter draws. COLOUR is a whole row for CLEAR
        and FILL; for a line or a pixel only its bit 0 counts. ARG is the length of a line, or the
        ROM address of a sprite's first byte.
      </p>
    </section>
  );
}
