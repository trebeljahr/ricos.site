import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MAX_CAMERA_DISTANCE, MIN_CAMERA_DISTANCE } from "./geo";
import { useCameraFocus, useIdleAutoRotate } from "./useGlobeInteraction";

export type GlobeControlsProps = {
  /** Idle spin. Off while a trip is hovered or selected, and under reduced motion. */
  autoRotate: boolean;
  /** Drag inertia. Reduced motion turns it off so the globe stops the moment you do. */
  damping: boolean;
  /** Lat/lng to swing to the front, or `null` to leave the camera where it is. */
  focus: { lat: number; lng: number } | null;
  /** Jump straight there instead of animating. */
  instantFocus: boolean;
};

/**
 * Camera behaviour: drag to rotate, wheel or pinch to zoom, no panning, and a slow idle
 * spin that gets out of the way as soon as anybody touches the globe.
 */
export function GlobeControls({ autoRotate, damping, focus, instantFocus }: GlobeControlsProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);

  useIdleAutoRotate(controls, autoRotate);
  useCameraFocus(controls, focus, instantFocus);

  /*
    OrbitControls sets `touch-action: none` on the canvas when it connects, which makes the
    globe eat every touch drag and strands a phone reader mid-page. `pan-y` hands vertical
    swipes back to the browser: the page scrolls, the controls get a pointercancel, and
    sideways drags still turn the globe. Pinch-to-zoom is not a `pan-y` gesture, so it
    keeps going to the scene.
  */
  useEffect(() => {
    const element = controls.current?.domElement;
    if (element instanceof HTMLElement) element.style.touchAction = "pan-y";
  }, []);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={damping}
      dampingFactor={0.07}
      rotateSpeed={0.45}
      zoomSpeed={0.6}
      autoRotateSpeed={0.35}
      minDistance={MIN_CAMERA_DISTANCE}
      maxDistance={MAX_CAMERA_DISTANCE}
    />
  );
}
