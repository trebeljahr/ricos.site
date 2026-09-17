import clsx from "clsx";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";
import type { PagePoint } from "./LightningOverlay";

// three.js only loads the first time someone finds this egg.
const LightningOverlay = dynamic(() => import("./LightningOverlay"), { ssr: false });

const MAX_BOLTS = 3;
const GLOW_MS = 1500;

type Strike = { source: PagePoint; targets: PagePoint[] };

/** Bolts go from the palette to up to three random demo cards in the section. */
function planStrike(palette: Element): Strike {
  const box = pageBox(palette);
  const source = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const section = palette.closest("h2")?.parentElement;
  const cards = [...(section?.querySelectorAll(".grid a") ?? [])]
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX_BOLTS)
    .map((card) => {
      const c = pageBox(card);
      return { x: c.left + c.width * (0.3 + Math.random() * 0.4), y: c.top + c.height * 0.4 };
    });
  const targets = cards.length ? cards : [{ x: source.x + 240, y: source.y + 160 }];
  return { source, targets };
}

const CreativeCodingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef, busy } = useEggRunner();
  const paletteRef = useRef<HTMLSpanElement>(null);
  const [strike, setStrike] = useState<Strike | null>(null);
  const done = useRef<() => void>(() => undefined);

  const registerClick = useEasterEgg("creative-coding", {
    onTrigger: () =>
      run(async () => {
        if (!paletteRef.current) return;
        if (reduceMotion) {
          await wait(GLOW_MS);
          return;
        }
        await new Promise<void>((resolve) => {
          done.current = resolve;
          setStrike(planStrike(paletteRef.current as Element));
        });
        setStrike(null);
      }),
  });

  return (
    <>
      <span className={clsx(busy && "text-accent")}>Creative Coding</span>{" "}
      <EmojiButton
        label="Palette"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span
          ref={paletteRef}
          className="inline-block transition-[filter] duration-300"
          style={busy ? { filter: "drop-shadow(0 0 6px #7fd8ff)" } : undefined}
        >
          🎨
        </span>
      </EmojiButton>
      {strike && (
        <LightningOverlay
          source={strike.source}
          targets={strike.targets}
          onDone={() => done.current()}
        />
      )}
    </>
  );
};

export default CreativeCodingEgg;
