import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { latLngToVector3 } from "./geo";

/**
 * Whether an element is on screen. The globe renders continuously while it is, and stops
 * entirely when it is not, so scrolling past it costs nothing.
 */
export function useInViewport(ref: RefObject<HTMLElement | null>, margin = "200px"): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: margin,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin]);

  return visible;
}

/**
 * Slow idle spin that yields to the person using it: any drag, wheel or pinch stops it,
 * and it only comes back after `idleDelayMs` of stillness. Never runs when `enabled` is
 * false, which is how `prefers-reduced-motion`, hover and a selected trip switch it off.
 *
 * `enabled` flips on every hover, so it must not live in the same effect as the listeners:
 * tearing those down and rebuilding them restarts the spin immediately, and the globe
 * drags the region you just picked out of view the moment the pointer leaves a pin. The
 * idle clock therefore runs for the lifetime of the controls, and `enabled` only gates
 * whether the idle state is allowed to become actual rotation.
 */
export function useIdleAutoRotate(
  controlsRef: RefObject<OrbitControlsImpl | null>,
  enabled: boolean,
  idleDelayMs = 4000,
): void {
  const idle = useRef(true);
  const allowed = useRef(enabled);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const apply = () => {
      controls.autoRotate = allowed.current && idle.current;
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (timer) clearTimeout(timer);
      idle.current = false;
      apply();
    };
    const resume = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        idle.current = true;
        apply();
      }, idleDelayMs);
    };

    apply();
    controls.addEventListener("start", stop);
    controls.addEventListener("end", resume);
    return () => {
      if (timer) clearTimeout(timer);
      controls.removeEventListener("start", stop);
      controls.removeEventListener("end", resume);
      controls.autoRotate = false;
    };
  }, [controlsRef, idleDelayMs]);

  useEffect(() => {
    allowed.current = enabled;
    const controls = controlsRef.current;
    if (controls) controls.autoRotate = enabled && idle.current;
  }, [controlsRef, enabled]);
}

/**
 * Turns the globe so a given lat/lng faces the camera, keeping the current zoom.
 *
 * The camera orbits the origin, so "fly to" is only a rotation of its direction vector —
 * no target animation, and nothing for `OrbitControls` to fight over, because
 * `controls.update()` re-derives its spherical state from the camera each frame.
 */
export function useCameraFocus(
  controlsRef: RefObject<OrbitControlsImpl | null>,
  focus: { lat: number; lng: number } | null,
  instant: boolean,
): void {
  const target = useRef<Vector3 | null>(null);
  const scratch = useRef(new Vector3());

  useEffect(() => {
    if (!focus) {
      target.current = null;
      return;
    }
    target.current = new Vector3(...latLngToVector3(focus.lat, focus.lng, 1));
  }, [focus]);

  useFrame((state, delta) => {
    const destination = target.current;
    const controls = controlsRef.current;
    if (!destination || !controls) return;

    const distance = state.camera.position.length() || 1;
    const current = scratch.current.copy(state.camera.position).divideScalar(distance);
    // A per-second rate rather than a per-frame one, so the swing lasts the same time on
    // a 60 Hz and a 120 Hz screen.
    const step = instant ? 1 : 1 - 0.02 ** delta;
    current.lerp(destination, Math.min(1, step)).normalize();
    state.camera.position.copy(current).multiplyScalar(distance);
    controls.update();

    if (current.angleTo(destination) < 0.002) target.current = null;
  });
}
