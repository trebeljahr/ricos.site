// Underwater post-processing effect
// Uses inverse camera matrices for proper world-position reconstruction.
// mainImage's `uv` is [0,1].

uniform vec3 cameraPos;
uniform vec3 cameraLookAt;
uniform float uTime;
uniform float uWaterLevel;
uniform float uSubmersion;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uSunDir;
uniform mat4 uInvProjection;
uniform mat4 uInvView;

#ifndef PI
#define PI 3.14159265359
#endif

float dither(vec2 p) {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)) / 255.0;
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.877, 0.479, -0.479, 0.877);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}

// ─── World position from depth (the correct way) ──────────
// Standard deferred rendering technique:
// 1. UV + depth → NDC clip space
// 2. Inverse projection → view space
// 3. Inverse view (= camera matrixWorld) → world space

vec3 worldPosFromDepth(vec2 uv, float depth) {
  // UV [0,1] → NDC [-1,1], depth [0,1] → NDC [-1,1]
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 viewPos = uInvProjection * clip;
  viewPos /= viewPos.w;
  vec4 worldPos = uInvView * viewPos;
  return worldPos.xyz;
}

// ─── Beer-Lambert ──────────────────────────────────────────

vec3 depthFog(vec3 sceneColor, vec3 scatterColor, float dist, vec3 density) {
  return mix(sceneColor, scatterColor, clamp(1.0 - exp(-density * dist), 0.0, 1.0));
}

vec3 scatterColour(vec3 rd, float camDepth) {
  vec3 col = mix(vec3(0.02, 0.15, 0.25), vec3(0.04, 0.35, 0.45), abs(rd.y));
  col = mix(col, vec3(0.08, 0.55, 0.58), pow(1.0 - camDepth, 2.0) * 0.6);
  col += vec3(0.15, 0.9, 0.6) * pow(max(0.0, dot(uSunDir, -rd)), 4.0) * 0.3 * (1.0 - camDepth * 0.7);
  return col * 1.2;
}

// ─── Caustics ──────────────────────────────────────────────
// Uses actual world XZ position — no approximations needed now.

float causticWaves(vec2 p, float time) {
  float v = 0.0;
  v += sin(p.x * 2.1 + time * 0.7 + sin(p.y * 1.2 + time * 0.3) * 1.5);
  v += sin(p.y * 2.4 - time * 0.5 + sin(p.x * 1.4 - time * 0.4) * 1.3);
  v += sin((p.x + p.y) * 1.7 + time * 0.9) * 0.7;
  v += sin((p.x - p.y) * 2.0 - time * 0.6) * 0.5;
  return pow(abs(v) / 3.0, 0.7);
}

float caustics(vec2 worldXZ, float time) {
  mat2 r1 = mat2(0.921, -0.389, 0.389, 0.921);
  mat2 r2 = mat2(0.766, 0.643, -0.643, 0.766);
  // Finer caustic detail with brighter highlights
  vec2 p = worldXZ * 1.5;
  float c1 = causticWaves(r1 * p, time);
  float c2 = causticWaves(r2 * p * 1.3 + 5.0, time * 0.85);
  float c = c1 * c2;
  // Sharper peaks for bright focused spots
  return clamp(pow(c, 0.6) * 3.0, 0.0, 1.0);
}

// ─── God rays ──────────────────────────────────────────────
// World-space: project ray onto water surface for stable coordinates.

// Volumetric god rays via ray marching UPWARD through the water column.
// Uses the SAME caustics() function as the surface pattern so the light
// shafts align with the caustic holes on the floor.
float godRays(vec3 camPos, vec3 rd, float sceneDist, bool sceneIsSky, float time) {
  if (camPos.y >= uWaterLevel) return 0.0;

  vec3 marchDir;
  float maxDist;

  if (rd.y > 0.05) {
    marchDir = rd;
    float tSurf = (uWaterLevel - camPos.y) / rd.y;
    maxDist = min(tSurf, 60.0);
  } else {
    marchDir = normalize(vec3(rd.x * 0.5, 1.0, rd.z * 0.5));
    maxDist = min((uWaterLevel - camPos.y) / marchDir.y, 60.0);
  }

  // Limit march to scene geometry distance — rays stop at solid objects.
  // When marching along rd (looking up), use sceneDist directly.
  // When marching upward (looking down), scale by the angular difference.
  if (!sceneIsSky) {
    float occlusionDist;
    if (rd.y > 0.05) {
      occlusionDist = sceneDist;
    } else {
      // Project scene distance onto the upward march direction
      occlusionDist = sceneDist * max(dot(rd, marchDir), 0.3);
    }
    maxDist = min(maxDist, occlusionDist);
  }

  int NUM_STEPS = 16;
  float stepSize = maxDist / float(NUM_STEPS);

  float blueNoise = fract(52.9829189 * fract(
    0.06711056 * gl_FragCoord.x + 0.00583715 * gl_FragCoord.y));
  float marchT = stepSize * blueNoise;

  float accumLight = 0.0;

  for (int i = 0; i < 16; i++) {
    vec3 pos = camPos + marchDir * marchT;
    if (marchT > maxDist) break;

    float depthBelow = uWaterLevel - pos.y;
    if (depthBelow < 0.0) break;

    vec2 surfXZ = pos.xz + uSunDir.xz * depthBelow / max(uSunDir.y, 0.1);
    float lightFocus = caustics(surfXZ, time * 0.5);
    lightFocus = smoothstep(0.4, 0.9, lightFocus);

    float atten = exp(-depthBelow * 0.015);
    float marchFade = 1.0 - smoothstep(maxDist * 0.6, maxDist, marchT);
    accumLight += lightFocus * atten * marchFade;

    marchT += stepSize;
  }

  accumLight /= float(NUM_STEPS);
  accumLight *= 1.2;

  float viewFade = 0.3 + 0.7 * smoothstep(-0.2, 0.6, rd.y);
  return accumLight * viewFade;
}

float snellsWindow(vec3 rd, float time) {
  float crit = 0.66;
  float ripple = noise(rd.xz * 10.0 + time * 0.5) * 0.06;
  ripple += noise(rd.xz * 6.0 - time * 0.3) * 0.05;
  return smoothstep(crit - 0.05 + ripple, crit + 0.12 + ripple, rd.y);
}

// ─── Main ──────────────────────────────────────────────────

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float sub = clamp(uSubmersion, 0.0, 1.0);
  float t = uTime;
  vec2 centered = uv * 2.0 - 1.0;

  float rawDepth = texture(depthBuffer, uv).x;
  bool isSky = rawDepth > 0.999;

  // Reconstruct world position using inverse matrices (the correct way)
  vec3 worldPos = worldPosFromDepth(uv, rawDepth);
  vec3 rd = normalize(worldPos - cameraPos);
  float dist = length(worldPos - cameraPos);

  float camDepth = clamp((uWaterLevel - cameraPos.y) / 40.0, 0.0, 1.0);

  // ═══ ABOVE WATER ═══
  if (sub < 0.005) {
    if (!isSky && worldPos.y < uWaterLevel) {
      float uwDist = distance(worldPos, cameraPos);
      vec3 sc = scatterColour(rd, 0.0);
      vec3 fogged = depthFog(inputColor.rgb, sc, uwDist * 0.05, vec3(0.9, 0.28, 0.35) * 0.1);
      float c = caustics(worldPos.xz, t * 0.5);
      c *= (1.0 - smoothstep(5.0, 80.0, uwDist)) * 0.4;
      fogged *= 1.0 + c;
      outputColor = vec4(fogged + dither(gl_FragCoord.xy), 1.0);
      return;
    }
    outputColor = inputColor;
    return;
  }

  // ═══ UNDERWATER ═══

  // Refraction with edge check
  vec2 distOffset = vec2(
    noise(uv * 5.0 + t * vec2(0.4, -0.15)) - 0.5,
    noise(uv * 5.0 + t * vec2(-0.2, 0.3) + 50.0) - 0.5
  ) * 0.003 * sub;
  vec2 distUV = clamp(uv + distOffset, 0.0, 1.0);
  float distDepthCheck = texture(depthBuffer, distUV).x;
  vec2 finalUV = abs(distDepthCheck - rawDepth) > 0.05 ? uv : distUV;
  vec4 scene = texture(inputBuffer, finalUV);

  vec3 scatterCol = scatterColour(rd, camDepth);
  // Higher density so objects fully disappear before reaching the far plane.
  // At dist=80, green channel: 1-exp(-0.05*80) = 98% fogged.
  // At dist=120, green channel: 1-exp(-0.05*120) = 99.7% fogged.
  vec3 fogDensity = vec3(0.9, 0.28, 0.35) * 0.18;
  vec3 fogged = depthFog(scene.rgb, scatterCol, isSky ? 120.0 : dist, fogDensity);

  // ── Caustics (world-space) ──
  // Applied to ALL pixels (geometry + background) so there's no hard
  // edge at object silhouettes. Use the water surface XZ for the pattern.
  float caust = 0.0;
  {
    // For geometry: project along light direction based on depth below surface
    // For sky/background: use a far-away projection
    vec2 caustPos;
    if (!isSky) {
      float depthBelowSurface = max(uWaterLevel - worldPos.y, 0.0);
      vec2 lightProj = uSunDir.xz * depthBelowSurface / (4.0 * max(uSunDir.y, 0.1));
      caustPos = worldPos.xz + lightProj;
    } else {
      // Background: project ray far forward for continuous caustic pattern
      vec2 farXZ = cameraPos.xz + rd.xz * 80.0;
      caustPos = farXZ;
    }
    caust = caustics(caustPos, t * 0.5);
    // Fade caustics at the SAME rate as fog so they vanish together.
    caust *= exp(-dist * 0.05);
    caust *= 1.0 - camDepth * 0.4;

    // Estimate surface normal from depth buffer screen-space derivatives.
    // dFdx/dFdy of worldPos gives tangent vectors; cross product = normal.
    // Surfaces facing up (normal.y ≈ 1) get full caustics.
    // Vertical surfaces (normal.y ≈ 0) get no caustics.
    if (!isSky) {
      vec3 dpdx = dFdx(worldPos);
      vec3 dpdy = dFdy(worldPos);
      vec3 surfNormal = normalize(cross(dpdx, dpdy));
      // How much does this surface face upward?
      float upFacing = abs(surfNormal.y);
      caust *= smoothstep(0.2, 0.7, upFacing);
    }
  }

  // ── God rays (volumetric march toward surface) ──
  // Pass scene distance so rays stop at solid objects
  float rays = godRays(cameraPos, rd, dist, isSky, t);
  rays *= 1.0 - camDepth * 0.4;

  // ── Background ──
  vec3 bgColor = scatterCol;
  if (isSky) {
    float win = snellsWindow(rd, t);
    vec3 skyCol = vec3(0.5, 0.8, 0.95) * (1.6 - camDepth * 1.2);
    bgColor = mix(scatterCol, skyCol, win * (1.0 - camDepth * 0.6));
  }

  // ═══ COMPOSITE ═══
  vec3 result;

  if (isSky) {
    // Open water background — no caustics (nothing to project onto)
    result = bgColor;
  } else {
    // Geometry — apply caustics
    result = fogged * (1.0 + caust * 1.5);
  }

  // God rays: subtle additive light shafts
  result += vec3(0.15, 0.25, 0.2) * rays;

  // Vignette
  result *= mix(1.0, 1.0 - length(centered) * 0.12, 0.25);

  // Global blend
  result = mix(inputColor.rgb, result, sub);
  result += dither(gl_FragCoord.xy);
  outputColor = vec4(result, 1.0);
}
