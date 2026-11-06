import { useState } from "react";
import {
  CLOCK_PRESETS,
  clockFacts,
  formatHertz,
  formatSeconds,
  groupDigits,
  JET_CORE_RPM,
} from "src/lib/computer/clock";
import panel from "./ByteExplorer.module.css";
import styles from "./ClockFacts.module.css";
import shared from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";

const DEFAULT_PRESET = "desktop";

/**
 * One clock speed at a time, in numbers people know: the length of one tick,
 * how far light gets in it, and a jet engine turn. Usable in MDX articles.
 */
export function ClockFacts() {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET);
  const preset = CLOCK_PRESETS.find((item) => item.id === presetId) ?? CLOCK_PRESETS[0];
  const { hz } = preset;
  const facts = clockFacts(hz);
  const summary = `${formatHertz(hz, true)}: ${facts.perSecond} ${hz === 1 ? "tick" : "ticks"} every second. One tick lasts ${formatSeconds(1 / hz, true)}.`;

  return (
    <DemoMachine title="CLOCK" label="One clock speed in numbers">
      <div className={styles.bench}>
        <div className={shared.plate}>
          <fieldset className={styles.presets}>
            <legend className="sr-only">Clock speeds of real machines</legend>
            {CLOCK_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.preset}
                aria-pressed={item.id === preset.id}
                aria-label={`${item.name}${item.year ? `, ${item.year}` : ""}: ${formatHertz(item.hz, true)}`}
                onClick={() => setPresetId(item.id)}
              >
                <span>{item.name}</span>
                <small className={styles.presetDetail}>
                  {item.year && (
                    <>
                      <span>{item.year}</span>
                      <span className={styles.presetDot}>·</span>
                    </>
                  )}
                  <span>{formatHertz(item.hz)}</span>
                </small>
              </button>
            ))}
          </fieldset>
        </div>

        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>IN NUMBERS</span>
            <span>AT {formatHertz(hz)}</span>
          </div>
          <div className={`${panel.screen} ${styles.lcd}`}>
            <div className={panel.screenTop}>
              <span>TICKS EVERY SECOND</span>
            </div>
            <div className={styles.bigNumber}>{facts.perSecond}</div>
            <div className={styles.lcdLine}>
              {facts.perSecondName ? facts.perSecondName.toUpperCase() : " "}
            </div>
          </div>
          <dl className={styles.meters}>
            <div className={styles.meter}>
              <dt>ONE TICK LASTS</dt>
              <dd>{facts.tick}</dd>
              <dd className={styles.meterDetail}>HALF ON, HALF OFF</dd>
            </div>
            <div className={styles.meter}>
              <dt>LIGHT IN ONE TICK</dt>
              <dd>{facts.light}</dd>
              <dd className={styles.meterDetail}>AT 299,792 km/s</dd>
            </div>
            <div className={styles.meter}>
              <dt>ONE JET ENGINE TURN</dt>
              <dd>{facts.jetTicks}</dd>
              <dd className={styles.meterDetail}>
                TICKS · CORE AT {groupDigits(String(JET_CORE_RPM))} RPM
              </dd>
            </div>
            <div className={styles.meter}>
              <dt>IF EACH TICK TOOK 1{" "}s</dt>
              <dd>{facts.slowed}</dd>
              <dd className={styles.meterDetail}>TO PLAY BACK ONE SECOND</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
    </DemoMachine>
  );
}
