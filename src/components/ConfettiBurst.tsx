import ConfettiExplosion, { type ConfettiProps } from "react-confetti-explosion";
import { createPortal } from "react-dom";

/** The site's waving-hand celebration, optionally launched across the viewport. */
export function ConfettiBurst({
  fullscreen = false,
  ...props
}: ConfettiProps & { fullscreen?: boolean }) {
  const burst = (
    <ConfettiExplosion
      force={0.7}
      duration={2400}
      particleCount={120}
      particleSize={10}
      width={fullscreen && typeof window !== "undefined" ? window.innerWidth * 1.5 : 900}
      zIndex={400}
      {...props}
    />
  );
  if (!fullscreen) return burst;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-hidden="true"
      style={{ position: "fixed", top: "35%", left: "50%", pointerEvents: "none" }}
    >
      {burst}
    </div>,
    document.body,
  );
}
