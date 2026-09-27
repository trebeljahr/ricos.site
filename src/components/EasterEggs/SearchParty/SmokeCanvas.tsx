import { type RefObject, useEffect, useRef } from "react";

export type Point = { x: number; y: number };

type SmokeProps = {
  /** Where the pointer is, in client pixels, or null when it is away. */
  pointerRef: RefObject<Point | null>;
  /** Called every frame with the trailing focus, so the egg can pick things up. */
  onFocus: (x: number, y: number) => void;
  calm: boolean;
  /** Called with false when WebGL is missing, so the page can show its links. */
  onReady: (ok: boolean) => void;
  /** What the cloud stays open over: everything the sweep has already found. */
  clearRef: RefObject<HTMLElement[]>;
};

/** How much of the page the cloud can be holding open at once. */
const CLEARINGS = 12;
/** How far the torn edge of a clearing reaches past what was found. */
const FEATHER = 72;
/** How many samples of the focus the shader gets. Together they are the trail. */
const TRAIL = 24;
/** What is left of a trail sample after one frame. */
const TRAIL_DECAY = 0.93;
/** How lazily the focus follows the pointer: the opening drifts after it. */
const EASE = 0.14;
/** Reach of the opening, as a share of the smaller screen side. */
const REACH = 0.17;
/** The cloud is soft, so it renders below screen resolution and is scaled up. */
const SCALE = 0.6;

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Two layers of value noise, the second warped by the first: that warp is what
// turns round clouds into plumes. The trail carves the opening, with its edge
// chewed by the same noise so it never reads as a circle, and the rim of the
// opening catches a little light the way parting smoke does.
const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTint;
uniform float uFloor;
uniform float uReach;
uniform vec3 uTrail[${TRAIL}];
uniform vec4 uClear[${CLEARINGS}];
uniform int uClearCount;
uniform float uFeather;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y;
  vec2 drift = vec2(uTime * 0.013, -uTime * 0.032);
  vec2 warp = vec2(fbm(uv * 2.3 + drift), fbm(uv * 2.3 + drift + 4.3));
  float density = fbm(uv * 4.1 + warp * 0.8 + drift * 1.7);
  density = smoothstep(0.3, 0.74, density);

  // Finer noise chews the edge of the opening, so it tears rather than cuts.
  float chew = fbm(uv * 4.4 + drift * 2.0);
  float opened = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec3 puff = uTrail[i];
    if (puff.z <= 0.0) continue;
    float edge = uReach * (0.48 + 0.45 * density + 0.62 * chew);
    float near = 1.0 - clamp(distance(gl_FragCoord.xy, puff.xy) / edge, 0.0, 1.0);
    opened = max(opened, puff.z * smoothstep(0.0, 0.72, near));
  }

  // Whatever the sweep has found holds the cloud open for good. What is found
  // is a rectangle, but smoke has no rectangles in it, so the distance to it is
  // rippled by the noise. The ripple dies away towards the middle, which keeps
  // the clearing over what was found instead of drifting off it.
  float cleared = 0.0;
  // Measured as a share of the way out of the clearing rather than in pixels,
  // which rounds the corners off: what is found sits in a soft oval of thinner
  // cloud, and the noise pushes that oval's edge about so it is not drawn on.
  // Finer than the clearing itself, so the edge ripples instead of the whole
  // oval sliding off what it is meant to be holding open.
  float wobble = (fbm(uv * 14.0 + 5.0) - 0.5) * 0.14 + (chew - 0.5) * 0.1;
  for (int i = 0; i < ${CLEARINGS}; i++) {
    if (i >= uClearCount) break;
    vec4 box = uClear[i];
    vec2 middle = box.xy + box.zw * 0.5;
    vec2 reach = box.zw * 0.5 + vec2(uFeather);
    float out_ = length((gl_FragCoord.xy - middle) / reach);
    // Never quite all of it, so a wisp still drifts over what was found.
    cleared = max(cleared, 0.74 * (1.0 - smoothstep(0.25, 1.05, out_ + wobble)));
  }

  // Brightest where the smoke is half gone, which is the curling edge itself.
  // Only the moving opening lights up like that: a clearing that has been
  // standing for a while is simply thin, not outlined.
  float rim = opened * (1.0 - opened) * 4.0;
  float thinned = max(opened, cleared);
  // A floor everywhere, so even the thin parts of the cloud keep the page hidden,
  // and a little haze left inside the opening, so it is a thinning and not a hole.
  float alpha = (uFloor + density * (1.0 - uFloor)) * (1.0 - thinned * 0.6);
  vec3 color = uTint * (0.78 + density * 0.45 + rim * 0.5);
  outColor = vec4(color * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * The smoke, drawn by the GPU: one full-screen quad whose shader does all the
 * noise, so the page only has to hand it a few numbers per frame. The pointer
 * is followed a beat behind, and the last two dozen positions are passed on as
 * the trail that opens the cloud.
 */
export const SmokeCanvas = ({ pointerRef, onFocus, calm, onReady, clearRef }: SmokeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { alpha: true, antialias: false, depth: false });
    if (!canvas || !gl) {
      onReadyRef.current(false);
      return;
    }

    const program = gl.createProgram();
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!program || !vertex || !fragment) {
      onReadyRef.current(false);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onReadyRef.current(false);
      return;
    }
    // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL call, not a React hook
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    // Premultiplied alpha: the shader hands over colour already multiplied.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("uRes");
    const uTime = uniform("uTime");
    const uTint = uniform("uTint");
    const uFloor = uniform("uFloor");
    const uReach = uniform("uReach");
    const uTrail = uniform("uTrail[0]");
    const uClear = uniform("uClear[0]");
    const uClearCount = uniform("uClearCount");
    const uFeather = uniform("uFeather");

    const trail = new Float32Array(TRAIL * 3);
    const clearings = new Float32Array(CLEARINGS * 4);
    let head = 0;
    let focus: Point | null = null;
    let strength = 0;
    let frame = 0;
    let stopped = false;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const lost = (event: Event) => {
      event.preventDefault();
      stopped = true;
      onReadyRef.current(false);
    };
    canvas.addEventListener("webglcontextlost", lost);

    const draw = (now: number) => {
      if (stopped) return;
      frame = window.requestAnimationFrame(draw);
      resize();

      const target = pointerRef.current;
      if (target) {
        const to = { x: target.x * SCALE, y: (canvas.clientHeight - target.y) * SCALE };
        focus = focus
          ? { x: focus.x + (to.x - focus.x) * EASE, y: focus.y + (to.y - focus.y) * EASE }
          : to;
        strength += (1 - strength) * 0.1;
      } else {
        strength *= 0.94;
      }

      // Every sample fades a little, and this frame's focus goes in at the head.
      for (let i = 2; i < trail.length; i += 3) trail[i] *= TRAIL_DECAY;
      if (focus && strength > 0.01) {
        head = (head + 1) % TRAIL;
        trail[head * 3] = focus.x;
        trail[head * 3 + 1] = focus.y;
        trail[head * 3 + 2] = strength;
        onFocusRef.current(focus.x / SCALE, canvas.clientHeight - focus.y / SCALE);
      }

      // The found elements move with the page, so their boxes are read fresh.
      const found = clearRef.current;
      let count = 0;
      for (const el of found) {
        if (count === CLEARINGS) break;
        const box = el.getBoundingClientRect();
        if (box.bottom < 0 || box.top > canvas.clientHeight) continue;
        clearings[count * 4] = box.left * SCALE;
        clearings[count * 4 + 1] = (canvas.clientHeight - box.bottom) * SCALE;
        clearings[count * 4 + 2] = box.width * SCALE;
        clearings[count * 4 + 3] = box.height * SCALE;
        count++;
      }

      const dark = document.documentElement.classList.contains("dark");
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, calm ? 0 : now * 0.001);
      if (dark) gl.uniform3f(uTint, 0.42, 0.48, 0.6);
      else gl.uniform3f(uTint, 0.72, 0.76, 0.83);
      gl.uniform1f(uFloor, dark ? 0.55 : 0.66);
      gl.uniform1f(uReach, Math.min(canvas.width, canvas.height) * REACH);
      gl.uniform3fv(uTrail, trail);
      gl.uniform4fv(uClear, clearings);
      gl.uniform1i(uClearCount, count);
      gl.uniform1f(uFeather, FEATHER * SCALE);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = window.requestAnimationFrame(draw);
    onReadyRef.current(true);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", lost);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [calm, pointerRef, clearRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
};
