import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  ALPHABET,
  FLAG_PRESETS,
  flagText,
  HANGUL_LEADS,
  HANGUL_TAILS,
  HANGUL_VOWELS,
  hangulCodePoint,
  hangulText,
  isStandardEmoji,
  JOINED_EMOJI,
  languageReadout,
  languagesWriting,
  MARK_SCRIPTS,
  markedText,
  type NormalForm,
  pressMark,
  STYLE_BASES,
  STYLE_SELECTORS,
  TONE_BASES,
  TONES,
  ZWJ,
} from "src/lib/unicodeRecipes";
import { codePointFace, codePointLabel, readText, type TextReading } from "src/lib/unicodeText";
import panel from "./ByteExplorer.module.css";
import { MiniButton } from "./CodebookParts";
import styles from "./Unicode.module.css";
import { ByteRun, Choice, Counts, TextLayers, UnicodePanel } from "./UnicodeParts";

type Recipe = "tone" | "join" | "flag" | "marks" | "hangul" | "style";

const initial = {
  recipe: "tone" as Recipe,
  toneBase: 0,
  tone: 3,
  joined: 0,
  joiner: "ON" as "ON" | "OFF",
  flag: "DE",
  script: 0,
  base: 1,
  marks: [0x301] as number[],
  markForm: "NFD" as NormalForm,
  lead: 18,
  vowel: 0,
  tail: 4,
  hangulForm: "NFD" as NormalForm,
  styleBase: 0,
  selector: 2,
};

type State = typeof initial;

function composedMarks(state: State, form: NormalForm): string {
  return markedText(MARK_SCRIPTS[state.script].bases[state.base], state.marks, form);
}

function composedText(state: State): string {
  switch (state.recipe) {
    case "tone":
      return TONE_BASES[state.toneBase] + TONES[state.tone].mark;
    case "join":
      return JOINED_EMOJI[state.joined].join(state.joiner === "ON" ? ZWJ : "");
    case "flag":
      return flagText(state.flag);
    case "marks":
      return composedMarks(state, state.markForm);
    case "hangul":
      return hangulText(state.lead, state.vowel, state.tail, state.hangulForm);
    case "style":
      return STYLE_BASES[state.styleBase] + STYLE_SELECTORS[state.selector].mark;
  }
}

/** Whether what was built exists anywhere: a live reading of real data. */
function verdictOf(state: State, reading: TextReading): { text: string; known: boolean } | null {
  if (state.recipe === "hangul") return { text: "KOREAN", known: true };
  if (state.recipe === "marks") {
    const script = MARK_SCRIPTS[state.script];
    const found = languageReadout(languagesWriting(script, script.bases[state.base], state.marks));
    return found ? { text: found, known: true } : { text: "NO LANGUAGE FOUND", known: false };
  }
  const clusters = reading.graphemes.map((grapheme) => isStandardEmoji(grapheme.text));
  if (clusters.includes(null)) return null;
  const known = clusters.every(Boolean);
  const count = clusters.length > 1 ? `${clusters.length} ` : "";
  return { text: known ? `${count}STANDARD EMOJI` : "NOT A STANDARD EMOJI", known };
}

const FORMS = [
  { value: "NFC" as const, label: "NFC · COMPOSED" },
  { value: "NFD" as const, label: "NFD · DECOMPOSED" },
];

/** A thumbwheel: one window, one step at a time, round and round. */
function Wheel({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: readonly string[];
  onChange: (value: number) => void;
}) {
  const name = label.toLowerCase();
  const step = (by: number) => onChange((value + by + options.length) % options.length);
  return (
    <div className={styles.wheel}>
      <span>{label}</span>
      <div className={styles.wheelBody}>
        <MiniButton onClick={() => step(-1)} label={`Previous ${name}`}>
          ◀
        </MiniButton>
        <output className={styles.wheelWindow} aria-label={label}>
          {options[value]}
        </output>
        <MiniButton onClick={() => step(1)} label={`Next ${name}`}>
          ▶
        </MiniButton>
      </div>
    </div>
  );
}

/** One recipe's plate. It stays where it is; its key says whether it feeds the result. */
function Module({
  title,
  active,
  wide = false,
  onChoose,
  children,
}: {
  title: string;
  active: boolean;
  wide?: boolean;
  onChoose: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset className={clsx(styles.module, wide && styles.wideModule)} aria-label={title}>
      <button type="button" className={styles.moduleKey} aria-pressed={active} onClick={onChoose}>
        <i aria-hidden="true" />
        {title}
      </button>
      {children}
    </fieldset>
  );
}

function indexed(values: readonly string[]) {
  return values.map((label, value) => ({ value, label }));
}

/** Build one thing a reader calls a character, piece by piece. Usable in MDX articles. */
export function CharacterComposer() {
  const [state, setState] = useState(initial);
  const sound = usePanelSound();

  function update(patch: Partial<State>) {
    setState((current) => ({ ...current, ...patch }));
    sound.playButton();
  }

  /** Touching any control of a module also chooses that module. */
  function feed(recipe: Recipe, patch: Partial<State> = {}) {
    update({ recipe, ...patch });
  }

  const text = composedText(state);
  const reading = readText(text);
  const verdict = verdictOf(state, reading);
  const formsDiffer = composedMarks(state, "NFC") !== composedMarks(state, "NFD");

  return (
    <UnicodePanel title="CHARACTER COMPOSER" sound={sound}>
      <div className={styles.composer}>
        <div className={clsx(styles.bay, styles.rackBay)}>
          <div className={styles.rack}>
            <Module
              title="SKIN TONE"
              active={state.recipe === "tone"}
              onChoose={() => feed("tone")}
            >
              <Choice
                label="BASE"
                value={state.toneBase}
                options={indexed(TONE_BASES)}
                onChange={(toneBase) => feed("tone", { toneBase })}
              />
              <Choice
                label="TONE"
                value={state.tone}
                options={indexed(TONES.map((tone) => tone.label))}
                onChange={(tone) => feed("tone", { tone })}
              />
            </Module>

            <Module title="JOINER" active={state.recipe === "join"} onChoose={() => feed("join")}>
              <Choice
                label="PARTS"
                value={state.joined}
                options={indexed(JOINED_EMOJI.map((parts) => parts.join(ZWJ)))}
                onChange={(joined) => feed("join", { joined })}
              />
              <Choice
                label="ZERO WIDTH JOINER"
                value={state.joiner}
                options={[
                  { value: "ON", label: "ON" },
                  { value: "OFF", label: "OFF" },
                ]}
                onChange={(joiner) => feed("join", { joiner })}
              />
            </Module>

            <Module title="FLAG" active={state.recipe === "flag"} onChoose={() => feed("flag")}>
              <div className={styles.wheels}>
                <Wheel
                  label="FIRST LETTER"
                  value={ALPHABET.indexOf(state.flag[0])}
                  options={ALPHABET}
                  onChange={(index) => feed("flag", { flag: ALPHABET[index] + state.flag[1] })}
                />
                <Wheel
                  label="SECOND LETTER"
                  value={ALPHABET.indexOf(state.flag[1])}
                  options={ALPHABET}
                  onChange={(index) => feed("flag", { flag: state.flag[0] + ALPHABET[index] })}
                />
              </div>
              <Choice
                label="COUNTRY"
                value={state.flag}
                options={FLAG_PRESETS.map((value) => ({ value, label: value }))}
                onChange={(flag) => feed("flag", { flag })}
              />
            </Module>

            <Module title="STYLE" active={state.recipe === "style"} onChoose={() => feed("style")}>
              <Choice
                label="BASE"
                value={state.styleBase}
                options={indexed(STYLE_BASES.map((base) => `${base}︎`))}
                onChange={(styleBase) => feed("style", { styleBase })}
              />
              <Choice
                label="VARIATION SELECTOR"
                value={state.selector}
                options={indexed(STYLE_SELECTORS.map((selector) => selector.label))}
                onChange={(selector) => feed("style", { selector })}
              />
            </Module>

            <Module
              title="HANGUL"
              wide
              active={state.recipe === "hangul"}
              onChoose={() => feed("hangul")}
            >
              <div className={styles.wheels}>
                <Wheel
                  label="LEAD"
                  value={state.lead}
                  options={HANGUL_LEADS}
                  onChange={(lead) => feed("hangul", { lead })}
                />
                <Wheel
                  label="VOWEL"
                  value={state.vowel}
                  options={HANGUL_VOWELS}
                  onChange={(vowel) => feed("hangul", { vowel })}
                />
                <Wheel
                  label="TAIL"
                  value={state.tail}
                  options={HANGUL_TAILS}
                  onChange={(tail) => feed("hangul", { tail })}
                />
              </div>
              <Choice
                label="FORM"
                value={state.hangulForm}
                options={FORMS}
                onChange={(hangulForm) => feed("hangul", { hangulForm })}
              />
              <p className={styles.formula}>
                U+AC00 + 588×{state.lead} + 28×{state.vowel} + {state.tail} ={" "}
                <b>{codePointLabel(hangulCodePoint(state.lead, state.vowel, state.tail))}</b>
              </p>
            </Module>

            <Module
              title="MARKS"
              wide
              active={state.recipe === "marks"}
              onChoose={() => feed("marks")}
            >
              <div className={styles.markRows}>
                {MARK_SCRIPTS.map((script, index) => {
                  const current = index === state.script;
                  return (
                    <div key={script.name} className={styles.markRow}>
                      <span>{script.name}</span>
                      <div className={clsx(panel.presetRow, styles.choiceRow, styles.markKeys)}>
                        {script.bases.map((base, baseIndex) => (
                          <button
                            key={base}
                            type="button"
                            className={styles.markButton}
                            aria-label={`${script.name} base ${base}`}
                            aria-pressed={current && baseIndex === state.base}
                            onClick={() =>
                              feed("marks", {
                                script: index,
                                base: baseIndex,
                                marks: current ? state.marks : [],
                              })
                            }
                          >
                            {base}
                          </button>
                        ))}
                        <hr />
                        {script.marks.map((mark) => (
                          <button
                            key={mark}
                            type="button"
                            className={styles.markButton}
                            aria-label={`${script.name} ${codePointLabel(mark)}`}
                            aria-pressed={current && state.marks.includes(mark)}
                            onClick={() =>
                              feed(
                                "marks",
                                current
                                  ? { marks: pressMark(script, state.marks, mark) }
                                  : { script: index, base: 0, marks: [mark] },
                              )
                            }
                          >
                            {codePointFace(mark).text}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Choice
                label="FORM"
                value={state.markForm}
                options={FORMS}
                disabled={!formsDiffer}
                onChange={(markForm) => feed("marks", { markForm })}
              />
            </Module>
          </div>
        </div>

        <div className={styles.side}>
          <div className={clsx(styles.bay, styles.pinned)}>
            <output className={styles.result}>{text}</output>
            {verdict && (
              <p
                className={styles.verdict}
                data-known={verdict.known}
                data-testid="composer-verdict"
              >
                <i aria-hidden="true" />
                {verdict.text}
              </p>
            )}
          </div>
          <div className={styles.bay}>
            <Counts reading={reading} />
            <TextLayers reading={reading} singleFaceShown />
            <div className={styles.runHead}>BITS · IN ORDER</div>
            <ByteRun reading={reading} />
          </div>
        </div>
      </div>
    </UnicodePanel>
  );
}
