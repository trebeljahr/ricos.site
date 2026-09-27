type Bubble = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  life: number;
  wobble: number;
  hue: number;
  popY: number;
  popped: boolean;
};

const FOAM_MS = 900;
const DURATION_MS = 5200;
let running = false;

/** A bubble leaving the flask mouth: a short spill sideways, then a long sink down the page. */
function spawn(x: number, y: number): Bubble {
  // The logo sits at the left edge, so the spill leans right and stays short.
  const leftward = Math.random() < 0.3;
  return {
    x: x + (Math.random() - 0.5) * 8,
    y,
    vx: (leftward ? -1 : 1) * (20 + Math.random() * (leftward ? 70 : 150)),
    vy: -(30 + Math.random() * 90),
    r: 3 + Math.random() * 8,
    age: 0,
    life: 2.2 + Math.random() * 2.2,
    wobble: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.6 ? 330 : 185,
    // Jitter the pop depth, otherwise every bubble bursts on the same line a
    // fifth of the way down and the swarm looks like it hit a wall.
    popY: y + (window.innerHeight / 5) * (0.55 + Math.random() * 0.9),
    popped: false,
  };
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble) {
  const popping = b.age > b.life - 0.15;
  const fade = popping ? Math.max(0, (b.life - b.age) / 0.15) : Math.min(1, b.age * 6);
  const r = popping ? b.r * (1 + (1 - fade) * 0.6) : b.r;
  const x = b.x + Math.sin(b.age * 5 + b.wobble) * 3;

  ctx.globalAlpha = fade;
  const fill = ctx.createRadialGradient(x - r * 0.3, b.y - r * 0.3, r * 0.1, x, b.y, r);
  fill.addColorStop(0, `hsla(${b.hue}, 90%, 92%, 0.15)`);
  fill.addColorStop(1, `hsla(${b.hue}, 90%, 70%, 0.35)`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `hsla(${b.hue}, 90%, 85%, 0.8)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Shine.
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, b.y - r * 0.35, Math.max(0.8, r * 0.18), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Soft fallback for reduced motion: one still bubble emoji next to the logo that fades. */
function calmBubble(logo: HTMLElement) {
  const rect = logo.getBoundingClientRect();
  const el = document.createElement("span");
  el.textContent = "🫧";
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    left: `${rect.right + 2}px`,
    top: `${rect.top - 6}px`,
    fontSize: "16px",
    pointerEvents: "none",
    zIndex: "1000",
  });
  document.body.append(el);
  el.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], {
    duration: 1600,
  }).finished.finally(() => el.remove());
}

/**
 * Easter egg: the flask in the logo shakes, foams over and pours bubbles
 * out of the navbar and over the page. Drawn on a click-through canvas that
 * removes itself when the last bubble pops.
 */
export function bubbleOver(logo: HTMLElement | null) {
  if (!logo || running) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    calmBubble(logo);
    return;
  }
  running = true;

  logo.animate(
    [
      { rotate: "0deg" },
      { rotate: "-12deg" },
      { rotate: "12deg" },
      { rotate: "-10deg" },
      { rotate: "10deg" },
      { rotate: "-4deg" },
      { rotate: "0deg" },
    ],
    { duration: 600, easing: "ease-in-out" },
  );

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "1000",
  });
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    running = false;
    return;
  }

  const rect = logo.getBoundingClientRect();
  const mouthX = rect.left + rect.width * 0.5;
  const mouthY = rect.top + rect.height * 0.15;
  const bubbles: Bubble[] = [];
  const start = performance.now();
  let last = start;

  const tick = (now: number) => {
    const elapsed = now - start;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Foam first: a burst of bubbles while the flask shakes, then a trickle.
    const rate = elapsed < FOAM_MS ? 70 : elapsed < 2400 ? 12 : 0;
    const count = Math.floor(rate * dt + Math.random());
    for (let i = 0; i < count; i++) bubbles.push(spawn(mouthX, mouthY));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const b of bubbles) {
      b.age += dt;
      if (b.age >= b.life) continue;
      // Light as soap: the sideways spill dies fast, the sink down keeps going.
      b.vy += 260 * dt;
      b.vx *= 1 - 3 * dt;
      b.vy *= 1 - 0.6 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Pop a short way down the page rather than at the end of a long sink.
      if (!b.popped && b.y >= b.popY) {
        b.life = b.age + 0.15;
        b.popped = true;
      }
      drawBubble(ctx, b);
    }

    const alive = bubbles.some((b) => b.age < b.life);
    if (elapsed < DURATION_MS && (alive || elapsed < 2400)) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
      running = false;
    }
  };
  requestAnimationFrame(tick);
}
