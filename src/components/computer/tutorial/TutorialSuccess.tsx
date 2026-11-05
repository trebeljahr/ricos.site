import { useCallback, useEffect, useRef, useState } from "react";
import { ConfettiBurst } from "src/components/ConfettiBurst";
import { usePanelSound } from "src/hooks/usePanelSound";
import styles from "./TutorialSuccess.module.css";

/** Inline correctness persists; the shared site celebration fills the viewport. */
export function TutorialSuccess({
  correct,
  message,
  celebration,
}: {
  correct: boolean;
  message?: string;
  celebration: number;
}) {
  const { soundEnabled, toggleSound, playSuccess } = usePanelSound({ defaultEnabled: false });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(false);
  const seen = useRef(0);
  const finishCelebration = useCallback(() => setActive(false), []);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    if (!celebration || seen.current === celebration) return;
    seen.current = celebration;
    playSuccess();
    if (reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setActive(true);
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
        <div key={celebration} data-tutorial-confetti={celebration} aria-hidden="true">
          <ConfettiBurst fullscreen onComplete={finishCelebration} />
        </div>
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
