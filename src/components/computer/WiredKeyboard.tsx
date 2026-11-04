import { usePanelSound } from "@hooks/usePanelSound";
import clsx from "clsx";
import {
  type CSSProperties,
  memo,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Board,
  type BoardKey,
  buildBoard,
  columnX,
  germanLayout,
  type KeyboardLayout,
  keyLegends,
  layoutFromKeyPress,
  layoutFromLanguage,
  layoutFromMap,
  MATRIX,
  PLATE_ROWS,
  PLATE_WIDTH,
  US_LAYOUT,
} from "../../lib/computer/keyboardBoard";
import {
  clearMemory,
  createMachine,
  type KeyboardMachine,
  MEMORY_BASE,
  MEMORY_SIZE,
  pressKey,
  releaseKey,
  stepRow,
} from "../../lib/computer/keyboardMachine";
import panel from "./ByteExplorer.module.css";
import styles from "./WiredKeyboard.module.css";

// The drawing in key widths: row driver, plate, column sense chip, then the
// wires that leave the bottom edge for the controller.
const PLATE_LEFT = 1.7;
const PLATE_TOP = 0.15;
const DRAWING_WIDTH = PLATE_LEFT + PLATE_WIDTH + 0.15;
const DRIVER_EDGE = 1.12;
const SENSE_TOP = PLATE_ROWS + 0.3;
const SENSE_HEIGHT = 0.72;
const DRAWING_HEIGHT = PLATE_TOP + SENSE_TOP + SENSE_HEIGHT + 0.3;
const TRUNK_X = 4;

const left = (x: number) => `${(x / DRAWING_WIDTH) * 100}%`;
const top = (y: number) => `${(y / DRAWING_HEIGHT) * 100}%`;
const hex = (value: number, digits = 2) =>
  `0x${value.toString(16).toUpperCase().padStart(digits, "0")}`;

const SPEEDS = [
  { label: "90 rows/s", ms: 1000 / 90 },
  { label: "8 rows/s", ms: 125 },
  { label: "2 rows/s", ms: 500 },
];

const LAYOUT_CHOICES = ["auto", "us", "de"] as const;
type LayoutChoice = (typeof LAYOUT_CHOICES)[number];

const isMac = () => /Mac|iPhone|iPad/.test(globalThis.navigator?.userAgent ?? "");

const CONTROL_NAMES: Record<string, string> = { "\n": "LF", "\b": "BS", "\t": "TAB", " ": "SP" };
const charName = (character: string) => CONTROL_NAMES[character] ?? character;
const glyph = (byte: number) => (byte >= 0x21 && byte < 0x7f ? String.fromCharCode(byte) : "");

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** Space and Enter belong to a focused button or link, unless that button is a key of the keyboard. */
function isOtherControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, a, summary");
  return control !== null && !control.hasAttribute("data-key");
}

/** One key: its cap, with the switch visible through it. */
const Keycap = memo(function Keycap({
  keyInfo,
  down,
  closed,
  live,
  capsOn,
}: {
  keyInfo: BoardKey;
  down: boolean;
  closed: boolean;
  /** The switch is closed and its row is being driven this instant. */
  live: boolean;
  capsOn: boolean;
}) {
  const { top: upper, bottom } = keyLegends(keyInfo);
  const style: CSSProperties = {
    left: left(PLATE_LEFT + keyInfo.x),
    top: top(PLATE_TOP + keyInfo.y),
    width: left(keyInfo.w),
    height: top(keyInfo.h),
  };
  const contact: CSSProperties = {
    left: `${((keyInfo.contactX - keyInfo.x) / keyInfo.w) * 100}%`,
    top: `${((keyInfo.contactY - keyInfo.y) / keyInfo.h) * 100}%`,
  };
  return (
    <button
      type="button"
      tabIndex={-1}
      data-key={keyInfo.code}
      className={clsx(
        styles.key,
        keyInfo.legend !== undefined && styles.functionKey,
        keyInfo.isoEnter && styles.isoEnter,
      )}
      style={style}
      aria-label={`${keyInfo.name} key`}
      aria-pressed={down}
    >
      <span className={styles.cap}>
        {upper && <span className={styles.legendTop}>{upper}</span>}
        <span className={styles.legend}>{bottom}</span>
        {keyInfo.code === "CapsLock" && (
          <span className={styles.capsLight} data-on={capsOn || undefined} />
        )}
      </span>
      <span
        className={styles.contact}
        style={contact}
        data-closed={closed || undefined}
        data-live={live || undefined}
      />
    </button>
  );
});

/** The row and column wires under the plate, and the two buses to the controller. */
const Wires = memo(function Wires({
  board,
  row,
  columnsLow,
}: {
  board: Board;
  row: number;
  columnsLow: readonly boolean[];
}) {
  const leadIn = DRIVER_EDGE - PLATE_LEFT;
  return (
    <svg
      className={styles.wires}
      viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g transform={`translate(${PLATE_LEFT} ${PLATE_TOP})`}>
        {board.columnWires.map((wire, column) => (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: a wire is its column
            key={column}
            className={styles.columnWire}
            data-on={columnsLow[column] || undefined}
            d={wire.replace(/^M (\S+) \S+/, `M $1 ${SENSE_TOP} V ${PLATE_ROWS}`)}
          />
        ))}
        {board.rowWires.map((wire, index) => (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: a wire is its row
            key={index}
            className={styles.rowWire}
            data-on={index === row || undefined}
            d={wire.replace("M 0", `M ${leadIn}`)}
          />
        ))}
      </g>
      <path
        className={styles.rowWire}
        data-on
        d={`M 0.6 ${PLATE_TOP + PLATE_ROWS} V ${DRAWING_HEIGHT}`}
      />
      <path
        className={styles.columnWire}
        data-on={columnsLow.some(Boolean) || undefined}
        d={`M ${TRUNK_X} ${PLATE_TOP + SENSE_TOP + SENSE_HEIGHT} V ${DRAWING_HEIGHT}`}
      />
    </svg>
  );
});

function Memory({
  memory,
  head,
  address,
  length,
}: {
  memory: readonly number[];
  head: number;
  address: number | null;
  length: number;
}) {
  const start = address === null ? -1 : address - MEMORY_BASE;
  const isLatest = (i: number) =>
    start >= 0 && length > 0 && (i - start + MEMORY_SIZE) % MEMORY_SIZE < length;
  return (
    <div className={styles.bay}>
      <div className={panel.sectionHead}>
        <span>MEMORY · KEYBOARD BUFFER</span>
        <output aria-label="Write pointer">{hex(MEMORY_BASE + head, 4)}</output>
      </div>
      <section className={styles.memory} aria-label="Keyboard buffer">
        {Array.from({ length: MEMORY_SIZE / 8 }, (_, line) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a line is its address
          <div className={styles.memoryLine} key={line}>
            <span className={styles.address}>{hex(MEMORY_BASE + line * 8, 4)}</span>
            {Array.from({ length: 8 }, (_, offset) => {
              const i = line * 8 + offset;
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a cell is its address
                  key={offset}
                  className={styles.cell}
                  data-address={hex(MEMORY_BASE + i, 4)}
                  data-head={i === head || undefined}
                  data-latest={isLatest(i) || undefined}
                >
                  <span>{memory[i].toString(16).toUpperCase().padStart(2, "0")}</span>
                  <small>{glyph(memory[i])}</small>
                </span>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}

/** A keyboard drawn key by key, its matrix wired to a controller that writes into memory. */
export function WiredKeyboard() {
  const [mac] = useState(isMac);
  const [choice, setChoice] = useState<LayoutChoice>("auto");
  const [detected, setDetected] = useState<KeyboardLayout>(() =>
    layoutFromLanguage(globalThis.navigator?.language ?? "en-US", mac),
  );
  const [learned, setLearned] = useState<Record<string, readonly [string?, string?]>>({});
  const [speed, setSpeed] = useState(0);
  const [armed, setArmed] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const { soundEnabled, toggleSound, playButton } = usePanelSound();

  const layout = useMemo<KeyboardLayout>(() => {
    if (choice === "us") return US_LAYOUT;
    if (choice === "de") return germanLayout(mac);
    const chars = { ...detected.chars };
    for (const [code, [plain, shifted]] of Object.entries(learned)) {
      const known = chars[code] ?? [];
      const nextPlain = plain ?? known[0];
      if (nextPlain === undefined) continue;
      // A newly learned plain character says nothing for the old Shift one, unless it is a letter.
      const capital = nextPlain.toUpperCase();
      const fallback =
        nextPlain === known[0] ? known[1] : capital !== nextPlain ? capital : undefined;
      chars[code] = [nextPlain, shifted ?? fallback];
    }
    return { ...detected, chars };
  }, [choice, detected, learned, mac]);
  const board = useMemo(() => buildBoard(layout, mac), [layout, mac]);

  const machine = useRef<KeyboardMachine | null>(null);
  if (!machine.current) machine.current = createMachine(MATRIX, board.matrixKeys, board.capsIndex);
  const [view, setView] = useState<KeyboardMachine>(machine.current);

  // Everything the key and pointer listeners read without being re-attached.
  const boardRef = useRef(board);
  const choiceRef = useRef(choice);
  const layoutRef = useRef(layout);
  const armedBy = useRef({ pointer: false, focus: false });
  const realKeys = useRef(new Map<string, number>());
  const pointers = useRef(new Map<number, number>());
  const latched = useRef(new Set<number>());
  const shownDown = useRef<ReadonlySet<number>>(down);
  const capsDownSeen = useRef(false);
  const playButtonRef = useRef(playButton);
  playButtonRef.current = playButton;
  const plateRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  /** Bring the machine's keys into line with every finger and real key now holding one down. */
  const syncKeys = useCallback(() => {
    const next = new Set<number>([
      ...realKeys.current.values(),
      ...pointers.current.values(),
      ...latched.current,
    ]);
    const previous = shownDown.current;
    let state = machine.current as KeyboardMachine;
    let pressed = false;
    for (const index of next)
      if (!previous.has(index)) {
        state = pressKey(state, index);
        pressed = true;
      }
    for (const index of previous) if (!next.has(index)) state = releaseKey(state, index);
    machine.current = state;
    shownDown.current = next;
    if (next.size !== previous.size || pressed) setDown(next);
    if (pressed) playButtonRef.current();
  }, []);

  // A new layout can move keys, so nothing may stay held across it. New labels alone keep the scan.
  const geometry = `${layout.physical}-${layout.swapIsoKeys}`;
  const geometryRef = useRef(geometry);
  useLayoutEffect(() => {
    boardRef.current = board;
    layoutRef.current = layout;
    choiceRef.current = choice;
    const current = machine.current as KeyboardMachine;
    if (geometryRef.current === geometry) {
      if (current.keys !== board.matrixKeys)
        machine.current = { ...current, keys: board.matrixKeys };
      return;
    }
    geometryRef.current = geometry;
    realKeys.current.clear();
    pointers.current.clear();
    latched.current.clear();
    shownDown.current = new Set();
    setDown(shownDown.current);
    const { memory, head, text, caps } = current;
    machine.current = {
      ...createMachine(MATRIX, board.matrixKeys, board.capsIndex),
      memory,
      head,
      text,
      caps,
    };
  }, [board, layout, choice, geometry]);

  // Ask the browser for the printed labels; where it cannot say, real presses teach them.
  useEffect(() => {
    const keyboard = (
      navigator as Navigator & {
        keyboard?: { getLayoutMap?: () => Promise<ReadonlyMap<string, string>> };
      }
    ).keyboard;
    let cancelled = false;
    keyboard
      ?.getLayoutMap?.()
      .then((map) => {
        if (!cancelled && map.size > 0) setDetected(layoutFromMap(map));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The scan clock. It stops while the demo is off screen.
  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rowMs = SPEEDS[speed].ms;
  useEffect(() => {
    if (!onScreen) return;
    let frame = 0;
    let previous = performance.now();
    let owed = 0;
    let shown: KeyboardMachine | null = null;
    const tick = (now: number) => {
      owed += Math.min(now - previous, 250);
      previous = now;
      let state = machine.current as KeyboardMachine;
      while (owed >= rowMs) {
        state = stepRow(state);
        owed -= rowMs;
      }
      machine.current = state;
      if (state !== shown) {
        shown = state;
        setView(state);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onScreen, rowMs]);

  // The real keyboard. Listening stays on for releases, so a key let go after
  // the pointer has left does not stick.
  useEffect(() => {
    const isArmed = () => armedBy.current.pointer || armedBy.current.focus;

    const learn = (key: BoardKey, event: KeyboardEvent) => {
      if (
        choiceRef.current !== "auto" ||
        key.legend !== undefined ||
        Array.from(event.key).length !== 1 ||
        event.getModifierState?.("CapsLock")
      )
        return;
      const known = event.shiftKey ? key.shifted : key.plain;
      if (known === event.key) return;
      setLearned((current) => {
        const [plain, shifted] = current[key.code] ?? [];
        return {
          ...current,
          [key.code]: event.shiftKey ? [plain, event.key] : [event.key, shifted],
        };
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isArmed() || isEditable(event.target)) return;
      const modifierKey = /^(Control|Alt|Meta)/.test(event.code);
      // Browser and system shortcuts are not typing.
      if ((event.metaKey || event.ctrlKey || event.altKey) && !modifierKey) return;
      if ((event.code === "Space" || event.code === "Enter") && isOtherControl(event.target))
        return;

      if (choiceRef.current === "auto" && Array.from(event.key).length === 1) {
        const corrected = layoutFromKeyPress(layoutRef.current, event.code, event.key, mac);
        if (corrected) {
          setDetected(corrected);
          event.preventDefault();
          return;
        }
      }
      const key = boardRef.current.byCode.get(event.code);
      if (!key) return;
      // Tab keeps moving focus, and function, arrow and modifier keys keep their browser meaning.
      const swallow = key.plain !== undefined && key.code !== "Tab";
      if (swallow) event.preventDefault();
      if (event.repeat) return;
      learn(key, event);

      if (key.code === "CapsLock") {
        // macOS sends only a down for "on" and only an up for "off"; both are one tap of the key.
        capsDownSeen.current = true;
        tapKey(key.index);
        return;
      }
      const state = machine.current as KeyboardMachine;
      const capsNow = event.getModifierState?.("CapsLock");
      if (capsNow !== undefined && capsNow !== state.caps && state.queue.length === 0)
        machine.current = { ...state, caps: capsNow };
      realKeys.current.set(event.code, key.index);
      syncKeys();
    };

    const tapKey = (index: number) => {
      machine.current = releaseKey(pressKey(machine.current as KeyboardMachine, index), index);
      playButtonRef.current();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "CapsLock") {
        const key = boardRef.current.byCode.get("CapsLock");
        if (key && !capsDownSeen.current && isArmed()) tapKey(key.index);
        capsDownSeen.current = false;
        return;
      }
      // macOS holds back the release of any key pressed while Command is down.
      if (event.code.startsWith("Meta")) realKeys.current.clear();
      else realKeys.current.delete(event.code);
      if (!event.code.startsWith("Shift")) latched.current.clear();
      syncKeys();
    };

    const releaseAll = () => {
      realKeys.current.clear();
      syncKeys();
    };
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mac, syncKeys]);

  const updateArmed = (source: "pointer" | "focus", value: boolean) => {
    armedBy.current[source] = value;
    setArmed(armedBy.current.pointer || armedBy.current.focus);
  };

  const keyAt = (target: EventTarget) => {
    const code =
      target instanceof Element ? target.closest<HTMLElement>("[data-key]")?.dataset.key : null;
    return code ? boardRef.current.byCode.get(code) : undefined;
  };
  const isShift = (key: BoardKey) => key.code.startsWith("Shift");

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const key = keyAt(event.target);
    if (!key || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    plateRef.current?.focus({ preventScroll: true });
    if (isShift(key)) {
      // One finger or a mouse cannot hold a chord, so Shift stays down until the next key is done.
      if (!latched.current.delete(key.index)) latched.current.add(key.index);
    } else {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointers.current.set(event.pointerId, key.index);
    }
    syncKeys();
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    latched.current.clear();
    syncKeys();
  };

  const { last, written, row, columnsLow, closed, caps } = view;
  const lastKey = last ? board.keys.find((key) => key.index === last.index) : undefined;
  const shiftHeld = board.keys.some((key) => isShift(key) && view.scanner.stable[key.index]);

  return (
    <section
      ref={rootRef}
      className={clsx("not-prose", panel.machine, styles.wired)}
      aria-label="Wired keyboard"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") updateArmed("pointer", true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") updateArmed("pointer", false);
      }}
      onFocus={() => updateArmed("focus", true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) updateArmed("focus", false);
      }}
    >
      <div className={panel.screw} aria-hidden="true" />
      <div className={clsx(panel.screw, panel.screwRight)} aria-hidden="true" />
      <div className={clsx(panel.nameplate, styles.nameplate)}>
        <div>
          <strong>KEYBOARD</strong>
          <output className={styles.lamp} data-on={armed || undefined} aria-label="Real keyboard">
            <i aria-hidden="true" />
            REAL KEYS {armed ? "ON" : "OFF"}
          </output>
        </div>
        <div className={styles.controls}>
          <label className={styles.control}>
            LAYOUT
            <select
              value={choice}
              onChange={(event) => setChoice(event.target.value as LayoutChoice)}
            >
              <option value="auto">
                Auto: {detected.name} {detected.physical.toUpperCase()}
              </option>
              <option value="us">{US_LAYOUT.name} ANSI</option>
              <option value="de">{germanLayout().name} ISO</option>
            </select>
          </label>
          <label className={styles.control}>
            SCAN
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              {SPEEDS.map(({ label }, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={panel.soundButton}
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            <i aria-hidden="true" />
            SOUND
          </button>
        </div>
      </div>

      <div className={styles.pcb}>
        <div
          ref={plateRef}
          className={styles.drawing}
          role="application"
          aria-label="Keyboard"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the one stop for typing on the real keyboard
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
          onContextMenu={(event) => {
            if (keyAt(event.target)) event.preventDefault();
          }}
        >
          <div
            className={styles.driver}
            style={{
              left: left(0.08),
              top: top(PLATE_TOP),
              width: left(DRIVER_EDGE - 0.08),
              height: top(PLATE_ROWS),
            }}
          >
            <span className={styles.chipName}>ROW DRIVER</span>
            {Array.from({ length: MATRIX.rows }, (_, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a pin is its row
                key={index}
                className={styles.rowPin}
                data-on={index === row || undefined}
                style={{ top: `${((index + 0.76) / PLATE_ROWS) * 100}%` }}
              >
                R{index}
              </span>
            ))}
          </div>
          <Wires board={board} row={row} columnsLow={columnsLow} />
          <div
            className={styles.sense}
            style={{
              left: left(PLATE_LEFT),
              top: top(PLATE_TOP + SENSE_TOP),
              width: left(PLATE_WIDTH),
              height: top(SENSE_HEIGHT),
            }}
          >
            {columnsLow.map((low, column) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a pin is its column
                key={column}
                className={styles.columnPin}
                data-on={low || undefined}
                style={{ left: `${(columnX(column) / PLATE_WIDTH) * 100}%` }}
              >
                {column}
              </span>
            ))}
            <span className={styles.chipName}>COLUMN SENSE</span>
          </div>
          {board.keys.map((key) => (
            <Keycap
              key={key.code}
              keyInfo={key}
              down={down.has(key.index)}
              closed={closed[key.index]}
              live={closed[key.index] && key.row === row}
              capsOn={key.code === "CapsLock" && caps}
            />
          ))}
        </div>
      </div>

      <div className={styles.deck}>
        <div className={styles.bay}>
          <div className={panel.sectionHead}>
            <span>CONTROLLER</span>
          </div>
          <dl className={styles.readings}>
            <dt>ROW</dt>
            <dd>
              <output aria-label="Row driven">R{row}</output>
            </dd>
            <dt>COLUMNS</dt>
            <dd className={styles.bits}>
              <output aria-label="Columns pulled low">
                {columnsLow.map((low) => (low ? "1" : "0")).join("")}
              </output>
            </dd>
            <dt>KEY</dt>
            <dd>
              <output aria-label="Last key event">
                {lastKey ? `R${lastKey.row} C${lastKey.column} ${last?.down ? "DOWN" : "UP"}` : "—"}
              </output>
            </dd>
            <dt>SHIFT</dt>
            <dd>
              <output aria-label="Shift">{shiftHeld ? 1 : 0}</output>
            </dd>
            <dt>CAPS</dt>
            <dd>
              <output aria-label="Caps Lock">{caps ? 1 : 0}</output>
            </dd>
            <dt>WROTE</dt>
            <dd>
              <output aria-label="Last write">
                {written
                  ? `${charName(written.character)} → ${written.bytes.map((b) => hex(b)).join(" ")}`
                  : "—"}
              </output>
            </dd>
          </dl>
        </div>
        <span
          key={written?.serial ?? "idle"}
          className={styles.bus}
          data-flash={written ? true : undefined}
          aria-hidden="true"
        />
        <Memory
          memory={view.memory}
          head={view.head}
          address={written?.address ?? null}
          length={written?.bytes.length ?? 0}
        />
        <div className={styles.screenBay}>
          <div className={panel.sectionHead}>
            <span>SCREEN</span>
            <button
              type="button"
              className={panel.soundButton}
              onClick={() => {
                machine.current = clearMemory(machine.current as KeyboardMachine);
              }}
            >
              CLEAR
            </button>
          </div>
          <output className={styles.screen} aria-label="Screen">
            <span>
              {view.text}
              <i className={styles.cursor} aria-hidden="true" />
            </span>
          </output>
        </div>
      </div>
    </section>
  );
}
