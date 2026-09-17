import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { LightningStrike } from "three-stdlib";

export type PagePoint = { x: number; y: number };

type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

const BOLT_START_MS = 60;
const BOLT_STAGGER_MS = 170;
const BOLT_MS = 650;
const DURATION_MS = 2400;
const GRAVITY = 1700;
const FADE_MS = 250;

function burst(
  sparks: Spark[],
  at: PagePoint,
  count: number,
  speed: [number, number],
  upward: number,
) {
  for (let i = 0; i < count; i++) {
    // Mostly upward, fanned out, so gravity pulls them into arcs across the page.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * upward;
    const v = speed[0] + Math.random() * (speed[1] - speed[0]);
    const maxLife = 0.6 + Math.random() * 1.1;
    sparks.push({
      x: at.x,
      y: at.y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: maxLife,
      maxLife,
    });
  }
}

/**
 * Lightning from the palette to a few demo cards, and sparks thrown across the page.
 * Uses the same LightningStrike geometry as /r3f/experiments/lightning-strike, drawn
 * with plain three.js (no React Three Fiber) on a click-through canvas that follows scroll.
 */
const LightningOverlay = ({
  source,
  targets,
  onDone,
}: {
  source: PagePoint;
  targets: PagePoint[];
  onDone: () => void;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const glCanvas = glRef.current;
    const sparkCanvas = sparkRef.current;
    const ctx = sparkCanvas?.getContext("2d");
    if (!wrapper || !glCanvas || !sparkCanvas || !ctx) return;
    let shown = false;
    let fadeTimer = 0;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let renderer: WebGLRenderer | null = null;
    try {
      renderer = new WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
    } catch {
      // No WebGL: the sparks still fly.
      renderer = null;
    }
    sparkCanvas.width = width * dpr;
    sparkCanvas.height = height * dpr;

    // World units are page pixels with y flipped, so the camera only has to follow scroll.
    const scene = new Scene();
    const camera = new OrthographicCamera(0, width, 0, -height, -10, 10);
    const material = new MeshBasicMaterial({
      color: "#e6f8ff",
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const bolts = targets.map((target) => {
      const geometry = new LightningStrike({
        sourceOffset: new Vector3(source.x, -source.y, 0),
        destOffset: new Vector3(target.x, -target.y, 0),
        radius0: 2.6,
        radius1: 1.2,
        minRadius: 0.6,
        maxIterations: 7,
        isEternal: true,
        timeScale: 1.4,
        propagationTimeFactor: 0.05,
        vanishingTimeFactor: 0.95,
        subrayPeriod: 0.8,
        subrayDutyCycle: 0.6,
        maxSubrayRecursion: 3,
        ramification: 5,
        recursionProbability: 0.6,
        roughness: 0.85,
        straightness: 0.65,
      });
      const mesh = new Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      return { geometry, mesh, target, sparked: false };
    });

    const sparks: Spark[] = [];
    burst(sparks, source, 70, [350, 1500], 1.7);

    const start = performance.now();
    let last = start;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sx = window.scrollX;
      const sy = window.scrollY;

      if (renderer) {
        bolts.forEach((bolt, i) => {
          const t = elapsed - BOLT_START_MS - i * BOLT_STAGGER_MS;
          const alive = t >= 0 && t < BOLT_MS;
          // Flicker out over the last third instead of just vanishing.
          bolt.mesh.visible = alive && (t < BOLT_MS * 0.66 || Math.random() > 0.45);
          if (alive && !bolt.sparked) {
            bolt.sparked = true;
            burst(sparks, bolt.target, 40, [200, 900], 1.9);
          }
          if (alive) bolt.geometry.update(elapsed / 1000);
        });
        camera.left = sx;
        camera.right = sx + width;
        camera.top = -sy;
        camera.bottom = -sy - height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (const s of sparks) {
        if (s.life <= 0) continue;
        s.vy += GRAVITY * dt;
        s.vx *= 0.99;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        const l = Math.max(0, s.life / s.maxLife);
        // White-hot when fresh, cooling to orange.
        ctx.strokeStyle = `hsla(${30 + 25 * l}, 100%, ${55 + 40 * l}%, ${l})`;
        ctx.lineWidth = 1 + 1.5 * l;
        ctx.beginPath();
        ctx.moveTo(s.x - sx, s.y - sy);
        ctx.lineTo(s.x - sx - s.vx * 0.02, s.y - sy - s.vy * 0.02);
        ctx.stroke();
      }

      // Show the canvases only once they hold a drawn frame, and fade them out
      // before they are removed: creating or dropping a WebGL canvas can flash.
      if (!shown) {
        shown = true;
        wrapper.style.opacity = "1";
      }
      if (elapsed < DURATION_MS) {
        frame = requestAnimationFrame(tick);
      } else {
        wrapper.style.opacity = "0";
        fadeTimer = window.setTimeout(() => onDoneRef.current(), FADE_MS + 20);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fadeTimer);
      for (const bolt of bolts) bolt.geometry.dispose();
      material.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [source, targets]);

  return createPortal(
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
      style={{ opacity: 0, transition: `opacity ${FADE_MS}ms ease-out` }}
    >
      <canvas
        ref={glRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "drop-shadow(0 0 3px #7fd8ff) drop-shadow(0 0 12px #3a9bff)" }}
      />
      <canvas ref={sparkRef} className="absolute inset-0 h-full w-full" />
    </div>,
    document.body,
  );
};

export default LightningOverlay;
