import { type FC, useEffect, useRef } from "react";

/**
 * Reading progress for the page. Chrome, Edge and Safari drive the bar from the
 * document's own scroll timeline in CSS, so nothing here runs at all there. Only
 * Firefox, which still keeps scroll timelines behind a flag, falls back to
 * writing `--scroll-progress` from a listener.
 */
export const ProgressBar: FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (CSS.supports("animation-timeline", "scroll()")) return;

    const track = trackRef.current;
    if (!track) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // A page that does not scroll gets no bar at all, which is what the CSS
      // path does by leaving an inactive timeline at its base style.
      track.dataset.scrollable = scrollable > 1 ? "yes" : "no";
      const progress = scrollable > 1 ? window.scrollY / scrollable : 0;
      track.style.setProperty("--scroll-progress", `${Math.min(Math.max(progress, 0), 1)}`);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    measure();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={trackRef} className="reading-progress" aria-hidden="true">
      <div className="reading-progress-bar" />
    </div>
  );
};
