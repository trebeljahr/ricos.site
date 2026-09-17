import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EASTER_EGG_IDS, EASTER_EGGS_CHANGED_EVENT, getFoundEggs } from "src/lib/easterEggs";
import { EmojiButton } from "./EmojiButton";

const known = new Set<string>(EASTER_EGG_IDS);
const MAX_BUNNIES = 4;
const HOP_ACROSS_MS = 5000;

/** A bunny that hops along the bottom of the screen once, then removes itself. */
const Bunny = ({ onDone }: { onDone: () => void }) => {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const across = el.animate(
      [
        { transform: "translateX(-3rem)" },
        { transform: `translateX(${window.innerWidth + 48}px)` },
      ],
      { duration: calm ? HOP_ACROSS_MS * 1.6 : HOP_ACROSS_MS, easing: "linear", fill: "forwards" },
    );
    const hops = calm
      ? null
      : inner.current?.animate(
          [
            { translate: "0 0", scale: "-1 1", easing: "ease-out" },
            { translate: "0 -1.6rem", scale: "-1 1.05", easing: "ease-in" },
            { translate: "0 0", scale: "-1 0.9" },
          ],
          { duration: 420, iterations: Number.POSITIVE_INFINITY },
        );
    across.finished.then(() => onDoneRef.current()).catch(() => undefined);
    return () => {
      across.cancel();
      hops?.cancel();
    };
  }, []);

  return (
    <span ref={outer} className="absolute bottom-2 left-0">
      {/* The rabbit emoji faces left; mirror it so it hops forward. */}
      <span ref={inner} className="inline-block text-3xl leading-none" style={{ scale: "-1 1" }}>
        🐇
      </span>
    </span>
  );
};

/** "N/12 easter eggs found", once at least one is found. Reads storage after mount, so SSR renders nothing. */
export const EggCounter = () => {
  const [found, setFound] = useState(0);
  const [bunnies, setBunnies] = useState<number[]>([]);

  useEffect(() => {
    const update = () => setFound(getFoundEggs().filter((id) => known.has(id)).length);
    update();
    window.addEventListener(EASTER_EGGS_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EASTER_EGGS_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (found === 0) return null;
  return (
    <span>
      <Link href="/eggs" className="hover:text-accent">
        {found}/{EASTER_EGG_IDS.length} easter eggs found
      </Link>{" "}
      <EmojiButton
        label="Easter egg"
        onClick={() =>
          setBunnies((current) =>
            current.length >= MAX_BUNNIES ? current : [...current, Date.now()],
          )
        }
      >
        🥚
      </EmojiButton>
      {bunnies.length > 0 &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-20 overflow-hidden"
          >
            {bunnies.map((id) => (
              <Bunny
                key={id}
                onDone={() => setBunnies((current) => current.filter((b) => b !== id))}
              />
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
};
