import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import { usePanelSound } from "src/hooks/usePanelSound";
import { limitCodePoints, readText } from "src/lib/unicodeText";
import typer from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DisplayStatus } from "./DisplayStatus";
import { fitHeight } from "./fitHeight";
import styles from "./Unicode.module.css";
import { ByteRun, Counts, TextLayers, UnicodePanel } from "./UnicodeParts";

const LIMIT = 48;
const initialText = "é👍🏽日本語";

const PRESETS: readonly { group: string; items: readonly { label: string; text: string }[] }[] = [
  {
    group: "EMOJI",
    items: [
      { label: "👍🏽", text: "👍🏽" },
      { label: "👩🏾‍💻", text: "👩🏾‍💻" },
      { label: "👨‍👩‍👧‍👦", text: "👨‍👩‍👧‍👦" },
      { label: "🏳️‍🌈", text: "🏳️‍🌈" },
      { label: "🇯🇵", text: "🇯🇵" },
      { label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", text: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { label: "❤️", text: "❤️" },
      { label: "1️⃣", text: "1️⃣" },
    ],
  },
  {
    group: "ACCENTS",
    items: [
      { label: "é U+00E9", text: "é" },
      { label: "é e + ◌́", text: "é" },
      { label: "Việt", text: "Việt" },
      { label: "Ñandú", text: "Ñandú" },
      { label: "Straße", text: "Straße" },
      { label: "Z̷̢͝a̵̛l̴̰g̷̈o", text: "Z̷̢͝a̵̛l̴̰g̷̈o" },
    ],
  },
  {
    group: "SCRIPTS",
    items: [
      { label: "Привет", text: "Привет" },
      { label: "Ελληνικά", text: "Ελληνικά" },
      { label: "中文字", text: "中文字" },
      { label: "こんにちは", text: "こんにちは" },
      { label: "한글", text: "한글" },
      { label: "नमस्ते", text: "नमस्ते" },
      { label: "مرحبا", text: "مرحبا" },
      { label: "שלום", text: "שלום" },
      { label: "สวัสดี", text: "สวัสดี" },
    ],
  },
];

/** Any text in; what a reader sees, the code points and the bytes out. Usable in MDX articles. */
export function UnicodeInspector() {
  const [text, setText] = useDemoState("unicode-inspector:text", initialText);
  const [overflow, setOverflow] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const id = useId();
  const sound = usePanelSound();

  const reading = readText(text);

  useLayoutEffect(() => {
    if (input.current) fitHeight(input.current);
  });

  useEffect(() => {
    const refit = () => {
      if (input.current) fitHeight(input.current);
    };
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, []);

  function commit(value: string) {
    const limited = limitCodePoints(value, LIMIT);
    if (limited.overflow > 0) sound.playRefuse();
    else if (limited.text.length > text.length) sound.playType("key");
    else if (limited.text.length < text.length) sound.playType("back");
    setText(limited.text);
    setOverflow(limited.overflow);
  }

  return (
    <UnicodePanel title="TEXT INSPECTOR" sound={sound}>
      <div className={styles.bay}>
        <label className={clsx(panel.inputLabel, styles.firstLabel)} htmlFor={`${id}-text`}>
          TYPE OR PASTE ANYTHING
        </label>
        <div className={typer.display}>
          <textarea
            ref={input}
            id={`${id}-text`}
            className={clsx(panel.bitInput, styles.textInput)}
            rows={1}
            value={text}
            onChange={(event) => {
              // An input method builds a character in several steps; judge the result, not the steps.
              if (composing.current) setText(event.target.value);
              else commit(event.target.value);
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              commit(event.currentTarget.value);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <DisplayStatus
            count={reading.codePointCount}
            limit={LIMIT}
            message={overflow > 0 ? "FULL" : null}
          />
        </div>
        {PRESETS.map((preset) => (
          <div key={preset.group} className={styles.presetGroup}>
            <span>{preset.group}</span>
            <div className={clsx(panel.presetRow, styles.choiceRow)}>
              {preset.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={text === item.text}
                  onClick={() => {
                    setText(item.text);
                    setOverflow(0);
                    sound.playButton();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>INSIDE</span>
        </div>
        <Counts reading={reading} />
        {reading.graphemes.length > 0 ? (
          <TextLayers reading={reading} />
        ) : (
          <p className={styles.empty}>NO TEXT YET</p>
        )}
      </div>

      {reading.bytes.length > 0 && (
        <div className={styles.bay}>
          <div className={panel.sectionHead}>
            <span>BITS · IN ORDER</span>
          </div>
          <ByteRun reading={reading} />
        </div>
      )}
    </UnicodePanel>
  );
}
