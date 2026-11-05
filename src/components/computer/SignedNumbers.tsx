import clsx from "clsx";
import { type CSSProperties, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";

import {
  bitMask,
  bitPattern,
  bitWeight,
  decodeInteger,
  displayInteger,
  INTEGER_ENCODINGS,
  type IntegerEncoding,
  type SignedWidth,
} from "../../lib/computer/signedNumbers";
import panel from "./ByteExplorer.module.css";
import { DemoMachine, Lever } from "./CodebookParts";
import styles from "./SignedNumbers.module.css";

/** The bit's weight written as a power of two, the way the mode reads it. */
function Power({
  bit,
  width,
  encoding,
}: {
  bit: number;
  width: SignedWidth;
  encoding: IntegerEncoding;
}) {
  const power = (
    <>
      2<sup>{bit}</sup>
    </>
  );
  if (bit !== width - 1 || encoding === "unsigned") return power;
  if (encoding === "sign-magnitude") return <>±</>;
  if (encoding === "twos-complement") return <>−{power}</>;
  return <>−({power}−1)</>;
}

/** Every digit times its power, then what those come to, then the number. */
function Formula({
  raw,
  width,
  encoding,
}: {
  raw: number;
  width: SignedWidth;
  encoding: IntegerEncoding;
}) {
  const signed = encoding === "sign-magnitude";
  const count = signed ? width - 1 : width;
  const bits = Array.from({ length: count }, (_, index) => count - index - 1);
  const digit = (bit: number) => (raw & (1 << bit) ? 1 : 0);
  const prefix = signed ? (digit(width - 1) ? "−(" : "+(") : "";
  const suffix = signed ? ")" : "";
  return (
    <code className={styles.formula}>
      <span>
        {prefix}
        {bits.map((bit, index) => {
          const top = bit === width - 1 && encoding !== "unsigned";
          return (
            <span key={bit}>
              {index > 0 && " + "}
              <span className={styles.term}>
                {digit(bit)}×{top && "("}
                <Power bit={bit} width={width} encoding={encoding} />
                {top && ")"}
              </span>
            </span>
          );
        })}
        {suffix}
      </span>
      <span>
        = {prefix}
        {bits
          .map((bit) => (digit(bit) ? displayInteger(bitWeight(bit, width, encoding)) : "0"))
          .join(" + ")}
        {suffix}
      </span>
      <span>= {displayInteger(decodeInteger(raw, width, encoding))}</span>
    </code>
  );
}

function BitLevers({
  raw,
  width,
  encoding,
  onFlip,
}: {
  raw: number;
  width: SignedWidth;
  encoding: IntegerEncoding;
  onFlip: (bit: number) => void;
}) {
  return (
    <fieldset
      className={styles.levers}
      style={{ "--bits": width } as CSSProperties}
      aria-label="Stored pattern"
    >
      {Array.from({ length: width }, (_, index) => {
        const bit = width - index - 1;
        const on = Boolean(raw & (1 << bit));
        return (
          <div className={styles.lever} key={bit}>
            <span className={styles.place}>
              <Power bit={bit} width={width} encoding={encoding} />
            </span>
            <Lever on={on} label={`Bit ${bit}`} onFlip={() => onFlip(bit)} />
            <b>{on ? 1 : 0}</b>
          </div>
        );
      })}
    </fieldset>
  );
}

function PatternList({
  raw,
  encoding,
  onPick,
}: {
  raw: number;
  encoding: IntegerEncoding;
  onPick: (pattern: number) => void;
}) {
  return (
    <ol className={styles.list} aria-label="All sixteen bit patterns">
      {Array.from({ length: 16 }, (_, pattern) => (
        <li key={pattern}>
          <button type="button" aria-pressed={pattern === raw} onClick={() => onPick(pattern)}>
            <code>{bitPattern(pattern, 4)}</code>{" "}
            <span>{displayInteger(decodeInteger(pattern, 4, encoding))}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function SignedNumberExplorer() {
  const [width, setWidth] = useState<SignedWidth>(4);
  const [raw, setRaw] = useState(11);
  const [encoding, setEncoding] = useState<IntegerEncoding>("twos-complement");
  const { soundEnabled, toggleSound, playButton, playSwitch, playToggle } = usePanelSound();
  const value = decodeInteger(raw, width, encoding);
  const mask = bitMask(width);
  const step = (by: number) => {
    setRaw((raw + by) & mask);
    playButton();
  };

  return (
    <DemoMachine
      title="SIGNED NUMBER REPRESENTATIONS"
      label="Signed number representations"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={styles.explorer}
    >
      <div className={clsx(styles.plate, styles.explorerPlate)}>
        <div className={styles.explorerMain}>
          <div className={styles.selectors}>
            <fieldset className={styles.selector}>
              <legend>READ AS</legend>
              <div className={clsx(panel.presetRow, styles.modes)}>
                {INTEGER_ENCODINGS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={item.id === encoding}
                    onClick={() => {
                      setEncoding(item.id);
                      playSwitch();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.selector}>
              <legend>WIDTH</legend>
              <div className={clsx(panel.presetRow, styles.modes)}>
                {([4, 8] as const).map((bits) => (
                  <button
                    type="button"
                    key={bits}
                    aria-pressed={width === bits}
                    onClick={() => {
                      setRaw(raw & bitMask(bits));
                      setWidth(bits);
                      playSwitch();
                    }}
                  >
                    {bits} BITS
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className={styles.bank}>
            <button
              type="button"
              className={clsx(panel.bitButton, styles.stepKey)}
              aria-label="Previous bit pattern"
              onClick={() => step(-1)}
            >
              −1
            </button>
            <BitLevers
              raw={raw}
              width={width}
              encoding={encoding}
              onFlip={(bit) => {
                setRaw(raw ^ (1 << bit));
                playToggle(!(raw & (1 << bit)));
              }}
            />
            <button
              type="button"
              className={clsx(panel.bitButton, styles.stepKey)}
              aria-label="Next bit pattern"
              onClick={() => step(1)}
            >
              +1
            </button>
          </div>
          <div className={clsx(panel.screen, styles.reading)} aria-live="polite">
            <output aria-label="Interpreted value">{displayInteger(value)}</output>
            <Formula raw={raw} width={width} encoding={encoding} />
          </div>
        </div>
        {width === 4 && (
          <PatternList
            raw={raw}
            encoding={encoding}
            onPick={(pattern) => {
              setRaw(pattern);
              playButton();
            }}
          />
        )}
      </div>
    </DemoMachine>
  );
}
