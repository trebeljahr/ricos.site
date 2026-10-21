import { type CSSProperties, useEffect, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import styles from "./TutorialSuccess.module.css";

const COLORS = ["#9ce7c2", "#ebce79", "#c1cafa"];
const PARTICLES = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  style: {
    "--x": `${(index % 2 ? 1 : -1) * (35 + ((index * 31) % 210))}px`,
    "--y": `${-55 + ((index * 19) % 125)}px`,
    "--spin": `${100 + index * 43}deg`,
    "--delay": `${(index % 4) * 35}ms`,
    "--color": COLORS[index % COLORS.length],
  } as CSSProperties,
}));

/** Inline correctness persists; each requested celebration stays within this feedback region. */
export function TutorialSuccess({
  correct,
  message,
  celebration,
}: {
  correct: boolean;
  message: string;
  celebration: number;
}) {
  const { soundEnabled, toggleSound, playSuccess } = usePanelSound({ defaultEnabled: false });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(false);
  const seen = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!celebration || seen.current === celebration) return;
    seen.current = celebration;
    playSuccess();
    if (reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setActive(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), 1300);
  }, [celebration, reducedMotion, playSuccess]);
  useEffect(() => {
    if (!celebration || !correct) setActive(false);
  }, [celebration, correct]);

  return (
    <div className={styles.root}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {correct && (
          <p className={styles.status}>
            <strong>✓ Correct wiring.</strong> {message}
          </p>
        )}
      </div>
      {active && correct && !reducedMotion && (
        <span
          key={celebration}
          className={styles.particles}
          data-tutorial-confetti={celebration}
          aria-hidden="true"
        >
          {PARTICLES.map((particle) => (
            <i key={particle.id} className={styles.particle} style={particle.style} />
          ))}
        </span>
      )}
      <button
        type="button"
        className={styles.sound}
        aria-pressed={soundEnabled}
        aria-label={`Success sound ${soundEnabled ? "on" : "off"}. Toggle success sound.`}
        onClick={toggleSound}
      >
        Success sound {soundEnabled ? "on" : "off"}
      </button>
    </div>
  );
}
