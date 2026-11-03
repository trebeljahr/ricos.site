import clsx from "clsx";
import { useId, useState } from "react";
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
  JOINED_EMOJI,
  MARK_SCRIPTS,
  markedText,
  type NormalForm,
  STYLE_BASES,
  STYLE_SELECTORS,
  TONE_BASES,
  TONES,
  ZWJ,
} from "src/lib/unicodeRecipes";
import { codePointFace, codePointLabel, readText, utf8ByteLength } from "src/lib/unicodeText";
import panel from "./ByteExplorer.module.css";
import styles from "./Unicode.module.css";
import { ByteRun, Choice, Counts, TextLayers, UnicodePanel } from "./UnicodeParts";

const RECIPES = [
  { value: "tone", label: "SKIN TONE" },
  { value: "join", label: "JOINER" },
  { value: "flag", label: "FLAG" },
  { value: "marks", label: "MARKS" },
  { value: "hangul", label: "HANGUL" },
  { value: "style", label: "STYLE" },
] as const;

type Recipe = (typeof RECIPES)[number]["value"];

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
  form: "NFD" as NormalForm,
  lead: 18,
  vowel: 0,
  tail: 4,
  styleBase: 0,
  selector: 2,
};

type State = typeof initial;

function composedText(state: State, form: NormalForm = state.form): string {
  switch (state.recipe) {
    case "tone":
      return TONE_BASES[state.toneBase] + TONES[state.tone].mark;
    case "join":
      return JOINED_EMOJI[state.joined].join(state.joiner === "ON" ? ZWJ : "");
    case "flag":
      return flagText(state.flag);
    case "marks":
      return markedText(MARK_SCRIPTS[state.script].bases[state.base], state.marks, form);
    case "hangul":
      return hangulText(state.lead, state.vowel, state.tail, form);
    case "style":
      return STYLE_BASES[state.styleBase] + STYLE_SELECTORS[state.selector].mark;
  }
}

const FORMS = [
  { value: "NFC" as const, label: "NFC · COMPOSED" },
  { value: "NFD" as const, label: "NFD · DECOMPOSED" },
];

function Picker({
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
  const id = useId();
  return (
    <span className={styles.picker}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option, index) => (
          <option key={option} value={index}>
            {option}
          </option>
        ))}
      </select>
    </span>
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

  const text = composedText(state);
  const reading = readText(text);
  const script = MARK_SCRIPTS[state.script];
  const hasForms = state.recipe === "marks" || state.recipe === "hangul";

  return (
    <UnicodePanel title="CHARACTER COMPOSER" sound={sound}>
      <div className={styles.bay}>
        <Choice
          label="BUILD"
          value={state.recipe}
          options={RECIPES}
          onChange={(recipe) => update({ recipe })}
        />
        <div className={styles.recipe}>
          {state.recipe === "tone" && (
            <>
              <Choice
                label="BASE"
                value={state.toneBase}
                options={indexed(TONE_BASES)}
                onChange={(toneBase) => update({ toneBase })}
              />
              <Choice
                label="TONE"
                value={state.tone}
                options={indexed(TONES.map((tone) => tone.label))}
                onChange={(tone) => update({ tone })}
              />
            </>
          )}
          {state.recipe === "join" && (
            <>
              <Choice
                label="PARTS"
                value={state.joined}
                options={indexed(JOINED_EMOJI.map((parts) => parts.join(ZWJ)))}
                onChange={(joined) => update({ joined })}
              />
              <Choice
                label="ZERO WIDTH JOINER"
                value={state.joiner}
                options={[
                  { value: "ON", label: "ON" },
                  { value: "OFF", label: "OFF" },
                ]}
                onChange={(joiner) => update({ joiner })}
              />
            </>
          )}
          {state.recipe === "flag" && (
            <>
              <div className={styles.pickers}>
                <Picker
                  label="FIRST LETTER"
                  value={ALPHABET.indexOf(state.flag[0])}
                  options={ALPHABET}
                  onChange={(index) => update({ flag: ALPHABET[index] + state.flag[1] })}
                />
                <Picker
                  label="SECOND LETTER"
                  value={ALPHABET.indexOf(state.flag[1])}
                  options={ALPHABET}
                  onChange={(index) => update({ flag: state.flag[0] + ALPHABET[index] })}
                />
              </div>
              <Choice
                label="COUNTRY"
                value={state.flag}
                options={FLAG_PRESETS.map((value) => ({ value, label: value }))}
                onChange={(flag) => update({ flag })}
              />
            </>
          )}
          {state.recipe === "marks" && (
            <>
              <Choice
                label="SCRIPT"
                value={state.script}
                options={indexed(MARK_SCRIPTS.map((entry) => entry.name))}
                onChange={(value) => update({ script: value, base: 0, marks: [] })}
              />
              <Choice
                label="BASE"
                value={state.base}
                options={indexed(script.bases)}
                onChange={(base) => update({ base })}
              />
              <fieldset className={styles.choice}>
                <legend>MARKS · {state.marks.length}</legend>
                <div className={clsx(panel.presetRow, styles.choiceRow)}>
                  {script.marks.map((mark) => (
                    <button
                      key={mark}
                      type="button"
                      className={styles.markButton}
                      aria-label={codePointLabel(mark)}
                      aria-pressed={state.marks.includes(mark)}
                      onClick={() =>
                        update({
                          marks: state.marks.includes(mark)
                            ? state.marks.filter((other) => other !== mark)
                            : [...state.marks, mark],
                        })
                      }
                    >
                      {codePointFace(mark).text}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {state.recipe === "hangul" && (
            <div className={styles.pickers}>
              <Picker
                label="LEAD"
                value={state.lead}
                options={HANGUL_LEADS}
                onChange={(lead) => update({ lead })}
              />
              <Picker
                label="VOWEL"
                value={state.vowel}
                options={HANGUL_VOWELS}
                onChange={(vowel) => update({ vowel })}
              />
              <Picker
                label="TAIL"
                value={state.tail}
                options={HANGUL_TAILS}
                onChange={(tail) => update({ tail })}
              />
            </div>
          )}
          {hasForms && (
            <Choice
              label="FORM"
              value={state.form}
              options={FORMS}
              onChange={(form) => update({ form })}
            />
          )}
          {state.recipe === "style" && (
            <>
              <Choice
                label="BASE"
                value={state.styleBase}
                options={indexed(STYLE_BASES.map((base) => `${base}︎`))}
                onChange={(styleBase) => update({ styleBase })}
              />
              <Choice
                label="VARIATION SELECTOR"
                value={state.selector}
                options={indexed(STYLE_SELECTORS.map((selector) => selector.label))}
                onChange={(selector) => update({ selector })}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>RESULT</span>
          {hasForms && (
            <span>
              NFC {utf8ByteLength(composedText(state, "NFC"))} B · NFD{" "}
              {utf8ByteLength(composedText(state, "NFD"))} B
            </span>
          )}
        </div>
        <output className={styles.result}>{text}</output>
        {state.recipe === "hangul" && (
          <p className={styles.formula}>
            U+AC00 + 588×{state.lead} + 28×{state.vowel} + {state.tail} ={" "}
            <b>{codePointLabel(hangulCodePoint(state.lead, state.vowel, state.tail))}</b>
          </p>
        )}
        <Counts reading={reading} />
        <TextLayers reading={reading} />
        <div className={styles.runHead}>BYTES · IN ORDER</div>
        <ByteRun reading={reading} />
      </div>
    </UnicodePanel>
  );
}
