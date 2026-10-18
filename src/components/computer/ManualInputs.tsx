import { useEffect, useId, useRef, useState } from "react";
import { decimalInput } from "../../lib/computer/manualInputs";
import styles from "./LogicBuilder.module.css";

export function DecimalInput({
  value,
  width,
  label,
  onChange,
}: {
  value: number;
  width: 4 | 8 | 14;
  label: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const id = useId();
  useEffect(() => {
    setDraft(String(value));
    setInvalid(false);
  }, [value]);
  const commit = () => {
    const next = decimalInput(draft, width);
    setInvalid(next === null);
    if (next !== null) {
      setDraft(String(next));
      if (next !== value) onChange(next);
    }
  };
  return (
    <label className={styles.decimalInput}>
      <span>Decimal</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        aria-label={`${label} decimal input`}
        aria-invalid={invalid}
        aria-describedby={id}
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(String(value));
            setInvalid(false);
          }
        }}
      />
      <small id={id} role={invalid ? "alert" : undefined}>
        {invalid ? "Not applied. " : ""}Whole decimal 0–{2 ** width - 1}; invalid values rejected.
      </small>
    </label>
  );
}

/**
 * Physical holding is explicit; click mode delivers a complete simulation pulse.
 * The owner sets the mode: the builder in a part's properties menu, a demo with its own control.
 */
export function ManualButton({
  label,
  mode,
  onPulse,
  onHeldChange,
}: {
  label: string;
  mode: "pulse" | "held";
  onPulse: () => void;
  onHeldChange: (high: boolean) => void;
}) {
  const held = useRef(false);
  const pointer = useRef<number | null>(null);
  const callback = useRef(onHeldChange);
  callback.current = onHeldChange;
  const [active, setActive] = useState(false);
  const flash = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const change = (high: boolean) => {
    if (held.current === high) return;
    held.current = high;
    setActive(high);
    callback.current(high);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: changing mode must cancel transient press and flash state.
  useEffect(() => {
    if (flash.current) clearTimeout(flash.current);
    flash.current = undefined;
    setActive(false);
    pointer.current = null;
    if (held.current) {
      held.current = false;
      setActive(false);
      callback.current(false);
    }
  }, [mode]);
  useEffect(() => {
    const release = () => {
      if (held.current) {
        held.current = false;
        setActive(false);
        callback.current(false);
      }
    };
    const hidden = () => {
      if (document.hidden) release();
    };
    const pointerRelease = (event: PointerEvent) => {
      if (pointer.current !== null && event.pointerId === pointer.current) {
        pointer.current = null;
        release();
      }
    };
    window.addEventListener("blur", release);
    window.addEventListener("pointerup", pointerRelease);
    window.addEventListener("pointercancel", pointerRelease);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", release);
      window.removeEventListener("pointerup", pointerRelease);
      window.removeEventListener("pointercancel", pointerRelease);
      document.removeEventListener("visibilitychange", hidden);
      if (flash.current) clearTimeout(flash.current);
      if (held.current) {
        held.current = false;
        callback.current(false);
      }
    };
  }, []);
  return (
    <div className={styles.manualInput}>
      <button
        type="button"
        className={styles.toggle}
        data-active={active || undefined}
        aria-label={`${label} ${mode === "held" ? "held button" : "pulse button"}`}
        aria-pressed={mode === "held" ? active : undefined}
        title={
          mode === "held"
            ? "High only while pressed. Release or blur returns low."
            : "One click records a rising edge and returns low, including while paused."
        }
        onPointerDown={(event) => {
          if (mode === "held" && event.button === 0) {
            pointer.current = event.pointerId;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            change(true);
          }
        }}
        onPointerUp={() => change(false)}
        onPointerCancel={() => change(false)}
        onLostPointerCapture={() => change(false)}
        onBlur={() => change(false)}
        onKeyDown={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          if (event.repeat || mode === "held") event.preventDefault();
          if (mode === "held" && !event.repeat) change(true);
        }}
        onKeyUp={(event) => {
          if (mode === "held" && (event.key === " " || event.key === "Enter")) {
            event.preventDefault();
            change(false);
          }
        }}
        onClick={() => {
          if (mode === "held") return;
          onPulse();
          setActive(true);
          if (flash.current) clearTimeout(flash.current);
          flash.current = setTimeout(() => setActive(false), 180);
        }}
      >
        {mode === "held" ? (active ? "RELEASE TO END" : "HOLD") : "PULSE"}
      </button>
    </div>
  );
}
