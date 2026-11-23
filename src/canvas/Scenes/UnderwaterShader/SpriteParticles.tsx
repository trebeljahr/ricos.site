import { type RootState, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, ShaderMaterial, Sphere, Vector3 } from "three";

/**
 * Camera-facing sprite particles for the ocean demo: spray, bubbles and marine snow.
 *
 * The sprites write depth and cut their shape with `discard` instead of alpha blending.
 * The ocean post-process reads the depth buffer to decide what is water, air or geometry,
 * so a blended sprite without depth would be painted over by the water surface and fogged
 * as if it were as far away as whatever is behind it.
 */

export type SpriteKind = "spray" | "bubble" | "snow";

export interface SpriteBuffers {
  /** xyz per particle, world space */
  positions: Float32Array;
  /** Sprite diameter in metres; 0 hides the particle */
  sizes: Float32Array;
  /** 0..1 visibility; the sprite dissolves into grain as it drops */
  fades: Float32Array;
}

const KIND_INDEX: Record<SpriteKind, number> = { spray: 0, bubble: 1, snow: 2 };

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aFade;
  uniform float uPixelScale;
  varying float vSeed;
  varying float vFade;
  varying float vPixels;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float pixels = aSize * uPixelScale * projectionMatrix[1][1] / max(-mv.z, 0.05);
    vPixels = pixels;
    vSeed = aSeed;
    vFade = aFade;
    gl_PointSize = clamp(pixels, 1.5, 220.0);
    if (aSize <= 0.0 || aFade <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  varying float vSeed;
  varying float vFade;
  varying float vPixels;

  float ign(vec2 p) {
    return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
  }

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    // Sprite space: x right, y up, unit circle touches the quad edges
    vec2 uv = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
    float r = length(uv);
    if (r > 1.0) discard;

    float dither = ign(gl_FragCoord.xy + vSeed * 173.0);
    vec3 col;

#if SPRITE_KIND == 0
    // Spray: small round droplets and larger ragged mist puffs, picked per particle
    float puff = step(0.45, fract(vSeed * 7.31));
    float ang = vSeed * 6.2831853;
    mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec2 q = rot * uv;
    float n = valueNoise(q * 2.1 + vSeed * 41.0) * 0.65 + valueNoise(q * 4.7 - vSeed * 17.0) * 0.35;
    // Puffs lose their outline to noise as they age; droplets stay round
    float erosion = mix(0.12, 0.55 + 0.55 * (1.0 - vFade), puff);
    // Fading shrinks the shape from its ragged edge inward, so a puff thins out instead of blinking off
    float shape = 1.0 - r - (n - 0.35) * erosion - (1.0 - vFade) * mix(0.9, 0.7, puff);
    float alpha = smoothstep(0.0, mix(0.18, 0.4, puff), shape);
    // A narrow dither band softens the cut-out edge without a visible dot screen
    if (alpha < mix(0.4, 0.6, dither)) discard;

    vec3 normal = vec3(uv, sqrt(max(0.0, 1.0 - r * r)));
    float lit = clamp(dot(normal, normalize(vec3(uSunDir.x, max(uSunDir.y, 0.3), 0.6))), 0.0, 1.0);
    vec3 shade = mix(vec3(0.66, 0.82, 0.93), vec3(1.0), 0.35 + 0.65 * lit);
    shade = mix(shade, vec3(0.86, 0.94, 0.99), puff * (0.35 + 0.3 * n));
    // The post-process darkens everything just above the waterline as wet rock; lift the spray so it stays white
    col = shade * 1.25;
#elif SPRITE_KIND == 1
    // Bubble: thin bright rim, a highlight toward the sun, a faint bounce at the bottom; see-through centre
    float rim = smoothstep(0.66, 0.9, r) * smoothstep(1.0, 0.94, r);
    float highlight = smoothstep(0.3, 0.1, length(uv - vec2(-0.36, 0.42)));
    float bounce = smoothstep(0.45, 0.85, r) * smoothstep(-0.2, -0.9, uv.y) * 0.55;
    float tiny = smoothstep(9.0, 4.0, vPixels);
    float body = max(max(rim, highlight), max(bounce, tiny * smoothstep(1.0, 0.5, r)));
    if (body * vFade < mix(0.35, 0.6, dither)) discard;
    col = mix(vec3(0.42, 0.78, 0.9), vec3(0.92, 1.0, 1.0), max(highlight, rim * rim));
#else
    // Marine snow: a soft drifting fleck
    float alpha = smoothstep(1.0, 0.15, r) * vFade;
    if (alpha < mix(0.25, 0.9, dither)) discard;
    col = vec3(0.62, 0.9, 0.84) * (0.75 + 0.35 * fract(vSeed * 13.7));
#endif

    gl_FragColor = vec4(col, 1.0);
  }
`;

const FAR_AWAY = new Sphere(new Vector3(0, 0, 0), 1e5);

export function SpriteParticles({
  count,
  kind,
  sunDirection,
  update,
}: {
  count: number;
  kind: SpriteKind;
  sunDirection?: Vector3;
  /** Runs every frame; write the particle state into the buffers */
  update: (buffers: SpriteBuffers, state: RootState, delta: number) => void;
}) {
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  const { geometry, buffers } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const fades = new Float32Array(count).fill(1);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = (i * 0.6180339887 + 0.137) % 1;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.setAttribute("aFade", new BufferAttribute(fades, 1));
    geom.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    // Particles move every frame; skip per-frame bounds and never cull the cloud
    geom.boundingSphere = FAR_AWAY;
    return { geometry: geom, buffers: { positions, sizes, fades } };
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        defines: { SPRITE_KIND: KIND_INDEX[kind] },
        uniforms: {
          uPixelScale: { value: 400 },
          uSunDir: { value: new Vector3(0.45, 0.74, 0.48).normalize() },
        },
      }),
    [kind],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (sunDirection) material.uniforms.uSunDir.value.copy(sunDirection).normalize();
  }, [material, sunDirection]);

  useFrame((state, delta) => {
    updateRef.current(buffers, state, delta);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aFade.needsUpdate = true;
    // Half the drawing-buffer height: converts metres at unit depth to pixels
    material.uniforms.uPixelScale.value = state.size.height * state.viewport.dpr * 0.5;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
