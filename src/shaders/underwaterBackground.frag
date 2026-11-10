// Unified Ocean + Underwater Post-Processing Shader
// Features:
// - Exact 3D Gerstner/trochoidal wave heightfield ray-intersection from above & below
// - Camera lens waterline meniscus with capillary curvature, dispersion & emergence wetness
// - Snell's window from underwater (critical angle 48.6 deg, dispersion rim, Total Internal Reflection)
// - Volumetric god rays (jittered 3D raymarch through caustic wave focal points + arch shadow occlusion + radial shafts)
// - 3-channel chromatic cellular/wave-Jacobian caustics on submerged geometry (from above & below)
// - Spectral Beer-Lambert absorption + depth-aware Henyey-Greenstein in-scattering
// - See-through water from above with depth-guarded UV refraction, subsurface crest scatter & contact foam

uniform vec3 cameraPos;
uniform vec3 uCameraForward;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;
uniform float uTime;
uniform float uWaterLevel;
uniform float uSubmersion;
uniform float uWetness;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uFovTan;
uniform float uAspect;
uniform vec3 uSunDir;
uniform mat4 uInvProjection;
uniform mat4 uInvView;
uniform mat4 uViewProjection;

// Optical preset uniforms
uniform vec3 uAbsorption;
uniform vec3 uScatterShallow;
uniform vec3 uScatterDeep;
uniform vec3 uSunScatter;
uniform float uFogDensity;
uniform float uCausticsIntensity;
uniform float uGodRayIntensity;
uniform float uWaveHeight;
uniform float uWaveChoppiness;
uniform float uWaterClarity;

#ifndef PI
#define PI 3.14159265359
#endif

// ─── Noise & Dithering ──────────────────────────────────────────

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
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.866, 0.5, -0.5, 0.866);
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p = rot * p * 2.03 + vec2(37.2, 19.8);
    a *= 0.5;
  }
  return v;
}

// ─── World Position Reconstruction ──────────────────────────────

vec3 worldPosFromDepth(vec2 uv, float depth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 viewPos = uInvProjection * clip;
  viewPos /= viewPos.w;
  vec4 worldPos = uInvView * viewPos;
  return worldPos.xyz;
}

// ─── Shared 3D Gerstner / Trochoidal Wave System ────────────────
// Steepened trochoidal waves: sin(phase + c * cos(phase)) produces
// sharp crests and broad troughs like Gerstner waves while remaining
// an exact single-valued heightfield for fast ray-surface intersection.

float waveHeightGeometric(vec2 p, float t) {
  float h = 0.0;
  float c = 0.28 * uWaveChoppiness;

  float p1 = p.x * 0.075 + p.y * 0.045 + t * 0.85;
  h += sin(p1 + c * cos(p1)) * 0.48;

  float p2 = -p.x * 0.055 + p.y * 0.082 - t * 0.72;
  h += sin(p2 + c * cos(p2)) * 0.36;

  float p3 = p.x * 0.19 + p.y * 0.14 + t * 1.35;
  h += sin(p3 + c * 0.8 * cos(p3)) * 0.20;

  float p4 = p.x * 0.15 - p.y * 0.23 - t * 1.15;
  h += sin(p4 + c * 0.8 * cos(p4)) * 0.15;

  float p5 = (p.x + p.y) * 0.42 + t * 2.05;
  h += sin(p5) * 0.08;

  float p6 = (p.x - p.y * 1.2) * 0.55 - t * 1.85;
  h += sin(p6) * 0.06;

  return h * uWaveHeight;
}

// High-frequency capillary ripples added for normal & foam evaluation
float waveHeightFull(vec2 p, float t, float detailWeight) {
  float h = waveHeightGeometric(p, t);
  if (detailWeight > 0.001) {
    float d = 0.0;
    d += sin(p.x * 1.35 + p.y * 0.95 + t * 3.1) * 0.028;
    d += sin(p.y * 1.75 - p.x * 0.85 - t * 2.7) * 0.022;
    d += sin((p.x - p.y) * 2.9 + t * 4.2) * 0.011;
    d += (valueNoise(p * 2.4 + vec2(t * 0.9, -t * 0.7)) - 0.5) * 0.025;
    d += (valueNoise(p * 6.5 - vec2(t * 1.4, t * 1.1)) - 0.5) * 0.009;
    h += d * uWaveHeight * detailWeight;
  }
  return h;
}

void evaluateWaveSurface(vec2 xz, float distToCam, float t, out float height, out vec3 normal, out float crestFoam) {
  // Attenuate micro-ripples with distance to prevent horizon aliasing
  float detailWeight = exp(-distToCam * 0.014);
  float eps = mix(0.06, 0.35, clamp(distToCam / 140.0, 0.0, 1.0));

  float hC = waveHeightFull(xz, t, detailWeight);
  float hX = waveHeightFull(xz + vec2(eps, 0.0), t, detailWeight);
  float hZ = waveHeightFull(xz + vec2(0.0, eps), t, detailWeight);
  float hXm = waveHeightFull(xz - vec2(eps, 0.0), t, detailWeight);
  float hZm = waveHeightFull(xz - vec2(0.0, eps), t, detailWeight);

  height = uWaterLevel + hC;
  vec3 dX = vec3(2.0 * eps, hX - hXm, 0.0);
  vec3 dZ = vec3(0.0, hZ - hZm, 2.0 * eps);
  normal = normalize(cross(dZ, dX));

  // Negative Laplacian = downward curvature at sharp wave crests (Jacobian compression)
  float laplacian = ((hX + hXm - 2.0 * hC) + (hZ + hZm - 2.0 * hC)) / (eps * eps);
  float steepness = 1.0 - normal.y;
  float rawCrest = max(0.0, -laplacian * 0.65) + steepness * 1.8 + max(0.0, hC / max(uWaveHeight, 0.01) - 0.45) * 0.7;
  float foamTex = fbm(xz * 1.6 + vec2(t * 0.35, -t * 0.25));
  crestFoam = smoothstep(0.58, 1.05, rawCrest * (0.65 + 0.7 * foamTex)) * detailWeight;
}

float signedHeightAboveWaves(vec3 pos, float t) {
  return pos.y - (uWaterLevel + waveHeightGeometric(pos.xz, t));
}

// ─── Exact Ray-Wave Heightfield Intersection ────────────────────
// Works from both above water (s0 > 0) and underwater (s0 < 0),
// including grazing angles near the waterline meniscus.

bool intersectWaveSurface(vec3 ro, vec3 rd, float s0, float maxDist, float t, out float tHit) {
  float maxAmp = 1.45 * uWaveHeight + 0.1;
  float targetSign = s0 >= 0.0 ? 1.0 : -1.0;

  bool bracketFound = false;
  float ta = 0.0;
  float tb = 0.0;
  float fa = s0;
  float fb = s0;

  // 1. Near-field check when camera is near the wave band (catches grazing wave crests/troughs)
  if (abs(ro.y - uWaterLevel) < maxAmp + 3.0) {
    float nearMax = min(maxDist, 36.0);
    float prevT = 0.0;
    float prevF = s0;
    for (int i = 1; i <= 10; i++) {
      float frac = float(i) / 10.0;
      float curT = nearMax * (frac * frac);
      float curF = signedHeightAboveWaves(ro + rd * curT, t);
      if (curF * targetSign <= 0.0) {
        ta = prevT;
        tb = curT;
        fa = prevF;
        fb = curF;
        bracketFound = true;
        break;
      }
      prevT = curT;
      prevF = curF;
    }
  }

  // 2. Slab intersection check for medium-to-far rays
  if (!bracketFound) {
    float yTop = uWaterLevel + maxAmp;
    float yBot = uWaterLevel - maxAmp;

    if (targetSign > 0.0 && rd.y < -0.0003) {
      float tEnter = max(0.0, (yTop - ro.y) / rd.y);
      float tExit = min(maxDist, (yBot - ro.y) / rd.y);
      if (tExit > tEnter) {
        float prevT = tEnter;
        float prevF = tEnter <= 0.001 ? s0 : signedHeightAboveWaves(ro + rd * tEnter, t);
        for (int i = 1; i <= 8; i++) {
          float curT = mix(tEnter, tExit, float(i) / 8.0);
          float curF = signedHeightAboveWaves(ro + rd * curT, t);
          if (curF <= 0.0) {
            ta = prevT;
            tb = curT;
            fa = prevF;
            fb = curF;
            bracketFound = true;
            break;
          }
          prevT = curT;
          prevF = curF;
        }
      }
    } else if (targetSign < 0.0 && rd.y > 0.0003) {
      float tEnter = max(0.0, (yBot - ro.y) / rd.y);
      float tExit = min(maxDist, (yTop - ro.y) / rd.y);
      if (tExit > tEnter) {
        float prevT = tEnter;
        float prevF = tEnter <= 0.001 ? s0 : signedHeightAboveWaves(ro + rd * tEnter, t);
        for (int i = 1; i <= 8; i++) {
          float curT = mix(tEnter, tExit, float(i) / 8.0);
          float curF = signedHeightAboveWaves(ro + rd * curT, t);
          if (curF >= 0.0) {
            ta = prevT;
            tb = curT;
            fa = prevF;
            fb = curF;
            bracketFound = true;
            break;
          }
          prevT = curT;
          prevF = curF;
        }
      }
    }
  }

  if (!bracketFound) {
    return false;
  }

  // 3. Guarded Secant (Regula Falsi) + Bisection refinement (5 iterations -> sub-mm precision)
  for (int k = 0; k < 5; k++) {
    float denom = fb - fa;
    float tMid = abs(denom) > 1e-5
      ? clamp(ta - fa * (tb - ta) / denom, mix(ta, tb, 0.12), mix(ta, tb, 0.88))
      : 0.5 * (ta + tb);
    float fMid = signedHeightAboveWaves(ro + rd * tMid, t);
    if (fMid * targetSign > 0.0) {
      ta = tMid;
      fa = fMid;
    } else {
      tb = tMid;
      fb = fMid;
    }
  }

  tHit = 0.5 * (ta + tb);
  return tHit <= maxDist;
}

// ─── Analytical Sky & Solar Radiance (for Reflections & Snell's Window) ───

vec3 evaluateSkyAndSun(vec3 dir, float t) {
  float y = max(dir.y, 0.0);
  vec3 zenithCol = vec3(0.16, 0.48, 0.88);
  vec3 horizonCol = vec3(0.68, 0.86, 0.96);
  vec3 warmHorizon = vec3(0.98, 0.82, 0.64);

  float sunAzimuthAlign = pow(max(0.0, dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z)))), 2.0);
  vec3 hCol = mix(horizonCol, warmHorizon, sunAzimuthAlign * 0.45);
  vec3 sky = mix(hCol, zenithCol, pow(y, 0.55));

  // Subtle high-altitude cirrus clouds
  if (dir.y > 0.03) {
    vec2 cloudUV = dir.xz / (dir.y + 0.18) * 0.35 + vec2(t * 0.008, -t * 0.005);
    float cl = fbm(cloudUV * 2.2);
    float cloudMask = smoothstep(0.48, 0.78, cl) * smoothstep(0.03, 0.25, dir.y);
    vec3 cloudCol = mix(vec3(0.95, 0.97, 1.0), vec3(1.0, 0.9, 0.78), pow(max(0.0, dot(dir, uSunDir)), 3.0));
    sky = mix(sky, cloudCol, cloudMask * 0.45);
  }

  // Mie solar aureole + crisp HDR sun disk (drives post-process Bloom)
  float cosSun = max(0.0, dot(dir, uSunDir));
  sky += vec3(1.0, 0.86, 0.62) * pow(cosSun, 8.0) * 0.45;
  sky += vec3(1.0, 0.94, 0.80) * pow(cosSun, 64.0) * 1.35;
  sky += vec3(1.8, 1.65, 1.35) * smoothstep(0.9982, 0.9997, cosSun) * 3.2;

  return sky;
}

// ─── Phase Function & Spectral Water Scattering ─────────────────

float henyeyGreenstein(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * cosTheta, 0.001), 1.5));
}

vec3 computeWaterScatterColor(vec3 rd, float camDepth01, vec3 refractedSunDir) {
  // Blend between deep abyssal scatter and shallow turquoise scatter based on camera depth & view angle
  float upLook = smoothstep(-0.6, 0.85, rd.y);
  float shallowFactor = clamp((1.0 - camDepth01 * 0.78) * (0.35 + 0.65 * upLook), 0.0, 1.0);
  vec3 baseScatter = mix(uScatterDeep, uScatterShallow, shallowFactor);

  // Dual-lobe Henyey-Greenstein forward scattering toward refracted sun vector
  float cosTheta = dot(rd, refractedSunDir);
  float phase = mix(henyeyGreenstein(cosTheta, 0.25), henyeyGreenstein(cosTheta, 0.78), 0.65);
  float sunDepthAtten = exp(-camDepth01 * 1.6);
  baseScatter += uSunScatter * phase * 0.85 * sunDepthAtten;

  return baseScatter;
}

// ─── Chromatic Cellular-Wave Caustics ───────────────────────────
// Produces crisp, interlocking catacaustic cusp filaments with subtle RGB dispersion.

float causticFilaments(vec2 p, float t) {
  mat2 m1 = mat2(0.84, -0.54, 0.54, 0.84);
  mat2 m2 = mat2(0.62, 0.78, -0.78, 0.62);

  // Domain warp by slow swell
  vec2 warp = vec2(
    sin(p.y * 0.7 + t * 0.65),
    cos(p.x * 0.75 - t * 0.55)
  ) * 0.35;
  vec2 q = p + warp;

  vec2 q1 = m1 * q * 1.15 + vec2(t * 0.42, -t * 0.31);
  vec2 q2 = m2 * q * 1.48 + vec2(-t * 0.38, t * 0.47);

  // Sharp ridge cusps from wave inflection lines (1 - |sin|)
  float r1 = 1.0 - abs(sin(q1.x + sin(q1.y * 1.3 + t * 0.5) * 0.85));
  float r2 = 1.0 - abs(sin(q1.y - cos(q1.x * 1.2 - t * 0.4) * 0.85));
  float r3 = 1.0 - abs(sin(q2.x + sin(q2.y * 1.1 - t * 0.6) * 0.75));
  float r4 = 1.0 - abs(sin(q2.y + cos(q2.x * 1.3 + t * 0.5) * 0.75));

  float netA = pow(clamp(r1 * r2, 0.0, 1.0), 2.4);
  float netB = pow(clamp(r3 * r4, 0.0, 1.0), 2.4);

  // Focal intersection hotspots + lacy filament web
  float focalPeaks = pow(netA * netB, 0.45) * 2.6;
  float web = (netA + netB) * 0.45;
  return clamp(focalPeaks + web, 0.0, 2.2);
}

vec3 chromaticCaustics(vec2 worldXZ, float depthBelowSurface, vec3 refractedSunDir, float t) {
  // Project along refracted sun vector to the water surface
  vec2 projXZ = worldXZ + refractedSunDir.xz * (depthBelowSurface / max(refractedSunDir.y, 0.2));
  vec2 scaleP = projXZ * mix(0.85, 1.25, uWaterClarity);

  // Chromatic dispersion offset grows gently with depth below surface
  vec2 dispDir = normalize(refractedSunDir.xz + vec2(0.001)) * clamp(depthBelowSurface * 0.008, 0.015, 0.09);

  float cR = causticFilaments(scaleP - dispDir, t);
  float cG = causticFilaments(scaleP, t);
  float cB = causticFilaments(scaleP + dispDir, t);

  // Caustics focus ~0.5m below the waves, peak at 1.5m-25m, and attenuate gracefully at depth
  float focusRamp = smoothstep(0.05, 1.4, depthBelowSurface);
  vec3 depthTransmittance = exp(-uAbsorption * depthBelowSurface * 0.42);

  return vec3(cR, cG, cB) * focusRamp * depthTransmittance * uCausticsIntensity;
}

// ─── Analytical Scene Blocker Occlusion for Volumetric God Rays ─
// Matches the grand submerged stone arch and sea-stack pillars so they cast
// real 3D crepuscular shadow shafts through the volumetric light beams.

float sampleSunBlockerOcclusion(vec3 pos, vec3 sunRayDir) {
  // Grand Stone Arch at z = -8, x in [-13, 13], arch ring radius ~13 around (0, 26, -8)
  // Ray-plane intersection with z = -8 plane (thickness 4.5m)
  if (abs(sunRayDir.z) > 0.02) {
    float tArch = (-8.0 - pos.z) / sunRayDir.z;
    if (tArch > 0.0 && tArch < 45.0) {
      vec3 hit = pos + sunRayDir * tArch;
      vec2 archRel = vec2(hit.x, (hit.y - 26.0) * 0.85);
      float r = length(archRel);
      // Arch stone ring between r = 9.0 and r = 14.5
      if (hit.y > 20.0 && r > 8.8 && r < 14.8) {
        return 0.12;
      }
    }
  }

  // Sea stack spire 1 at (-22, z = -16), radius ~5.5
  vec2 toSpire1 = vec2(-22.0, -16.0) - pos.xz;
  float proj1 = dot(toSpire1, normalize(sunRayDir.xz));
  if (proj1 > 0.0 && proj1 < 40.0) {
    float perpDist1 = length(toSpire1 - normalize(sunRayDir.xz) * proj1);
    if (perpDist1 < 5.2) return 0.15;
  }

  // Sea stack spire 2 at (24, z = -20), radius ~6.0
  vec2 toSpire2 = vec2(24.0, -20.0) - pos.xz;
  float proj2 = dot(toSpire2, normalize(sunRayDir.xz));
  if (proj2 > 0.0 && proj2 < 45.0) {
    float perpDist2 = length(toSpire2 - normalize(sunRayDir.xz) * proj2);
    if (perpDist2 < 5.8) return 0.15;
  }

  return 1.0;
}

// ─── Volumetric God Rays (3D Raymarch + Radial Backlit Shafts) ──

vec3 computeVolumetricGodRays(
  vec3 ro,
  vec3 rd,
  vec2 uv,
  float maxRayDist,
  vec3 refractedSunDir,
  float t
) {
  if (uGodRayIntensity <= 0.001) return vec3(0.0);

  // 1. 3D World-Space Volumetric Raymarching along the view ray
  float marchDist = min(maxRayDist, 62.0);
  const int NUM_STEPS = 24;
  float stepLen = marchDist / float(NUM_STEPS);
  float jitter = ign(gl_FragCoord.xy);

  vec3 accumVolumetric = vec3(0.0);
  float sunInvY = 1.0 / max(refractedSunDir.y, 0.22);

  for (int i = 0; i < NUM_STEPS; i++) {
    float marchT = (float(i) + jitter) * stepLen;
    vec3 samplePos = ro + rd * marchT;
    float depthBelow = uWaterLevel - samplePos.y;

    if (depthBelow > 0.0 && depthBelow < 58.0) {
      // Project sample point up to the wave surface along the refracted sun vector
      vec2 surfXZ = samplePos.xz + refractedSunDir.xz * (depthBelow * sunInvY);

      // Multi-scale wave lens focusing (broad shafts + fine beams)
      float focusCoarse = causticFilaments(surfXZ * 0.42, t * 0.55);
      float focusFine = causticFilaments(surfXZ * 1.05 + vec2(11.3, 7.1), t * 0.7);
      float shaftFocus = smoothstep(0.52, 1.45, focusCoarse) * 0.65
                       + smoothstep(0.68, 1.65, focusFine) * 0.55;

      // Analytical volumetric shadow from submerged arch & sea stacks
      float blocker = sampleSunBlockerOcclusion(samplePos, refractedSunDir);

      // Spectral attenuation from surface down to samplePos + along view ray
      vec3 sunAtten = exp(-uAbsorption * (depthBelow * 0.32 + marchT * 0.25));
      float nearSurfBoost = smoothstep(48.0, 0.0, depthBelow);

      accumVolumetric += sunAtten * (shaftFocus * blocker * nearSurfBoost);
    }
  }

  accumVolumetric /= float(NUM_STEPS);

  // Directional phase boost: bright when looking toward sun or upward, still visible from side
  float cosSun = dot(rd, refractedSunDir);
  float phaseBoost = 0.38 + 0.95 * pow(max(0.0, cosSun), 2.5) + 0.35 * smoothstep(-0.2, 0.7, rd.y);
  vec3 worldShafts = accumVolumetric * mix(uScatterShallow, uSunScatter, 0.6) * phaseBoost * 2.4;

  // 2. Screen-Space Radial Crepuscular Shafts (makes silhouettes of whales, kelp & rocks cast beams!)
  vec3 radialShafts = vec3(0.0);
  if (cosSun > 0.05) {
    vec4 sunClip = uViewProjection * vec4(cameraPos + refractedSunDir * 100.0, 1.0);
    if (sunClip.w > 0.0) {
      vec2 sunUV = (sunClip.xy / sunClip.w) * 0.5 + 0.5;
      vec2 deltaUV = (sunUV - uv);
      float screenDist = length(deltaUV);
      vec2 stepUV = deltaUV / 12.0;

      float radialAccum = 0.0;
      for (int j = 1; j <= 12; j++) {
        vec2 sUV = uv + stepUV * (float(j) + jitter * 0.5 - 0.25);
        if (sUV.x >= 0.0 && sUV.x <= 1.0 && sUV.y >= 0.0 && sUV.y <= 1.0) {
          float dSample = texture(depthBuffer, sUV).x;
          // Open water / Snell's window background contributes to backlit shaft
          float openWater = smoothstep(0.92, 0.999, dSample);
          radialAccum += openWater * (1.0 - float(j) / 14.0);
        }
      }
      radialAccum /= 12.0;
      float radialFalloff = exp(-screenDist * 1.8) * pow(cosSun, 2.0);
      radialShafts = mix(uScatterShallow, uSunScatter, 0.75) * radialAccum * radialFalloff * 0.85;
    }
  }

  return (worldShafts + radialShafts) * uGodRayIntensity;
}

// ─── Snell's Window & Underside Wave Shading ────────────────────
// Evaluates exact water-to-air refraction (n = 1.333), critical angle dispersion (48.6 deg),
// and Total Internal Reflection (TIR) on the 3D wave surface from below.

vec3 shadeUndersideWaterSurface(
  vec3 hitPos,
  vec3 waveNormal,
  float crestFoam,
  vec3 rd,
  vec2 uv,
  float camDepth01,
  vec3 refractedSunDir,
  float t
) {
  // waveNormal points UP (+Y). From underwater, the inward-facing surface normal is -waveNormal.
  vec3 N = -waveNormal;
  // Ensure normal faces the incoming ray to avoid degenerate grazing inversions
  if (dot(rd, N) > -0.02) {
    N = normalize(mix(N, -rd, 0.15));
  }

  float cosI = clamp(dot(-rd, N), 0.0, 1.0);

  // Chromatic dispersion indices of refraction (water -> air)
  const float etaR = 1.329;
  const float etaG = 1.333;
  const float etaB = 1.338;

  float sin2I = max(0.0, 1.0 - cosI * cosI);
  float kR = 1.0 - etaR * etaR * sin2I;
  float kG = 1.0 - etaG * etaG * sin2I;
  float kB = 1.0 - etaB * etaB * sin2I;

  // Total Internal Reflection (Reflected underwater environment)
  vec3 reflDir = reflect(rd, N);
  reflDir.y = -abs(reflDir.y); // Points down into the water column
  vec3 tirColor = computeWaterScatterColor(reflDir, camDepth01, refractedSunDir);

  // Add reflected seafloor caustics & wave-slope shimmer on the liquid mirror underside
  vec2 tirCaustXZ = hitPos.xz + reflDir.xz * 8.0;
  float tirCaust = causticFilaments(tirCaustXZ * 0.65, t * 0.6);
  float waveRelief = 0.5 + 0.5 * clamp((hitPos.y - uWaterLevel) / max(uWaveHeight, 0.1), -1.0, 1.0);
  tirColor *= (0.75 + 0.45 * waveRelief);
  tirColor += mix(uScatterShallow, uSunScatter, 0.5) * tirCaust * 0.22 * (1.0 - camDepth01 * 0.6);

  // If completely outside Snell's window for all wavelengths -> pure Total Internal Reflection
  if (kR <= 0.0) {
    return tirColor;
  }

  // Inside Snell's window: compute refracted sky + above-water scene for R, G, B
  vec3 refrDirG = normalize(etaG * rd + (etaG * cosI - sqrt(max(kG, 0.0001))) * N);
  refrDirG.y = max(refrDirG.y, 0.01);

  vec3 skyG = evaluateSkyAndSun(refrDirG, t);

  // Chromatic dispersion fringe right near the critical angle rim (kG in [0, 0.15])
  vec3 transmittedSky = skyG;
  if (kG < 0.18) {
    vec3 refrDirR = normalize(etaR * rd + (etaR * cosI - sqrt(max(kR, 0.0001))) * N);
    vec3 refrDirB = kB > 0.0
      ? normalize(etaB * rd + (etaB * cosI - sqrt(max(kB, 0.0001))) * N)
      : reflDir;
    float rCh = evaluateSkyAndSun(vec3(refrDirR.x, max(refrDirR.y, 0.01), refrDirR.z), t).r;
    float bCh = kB > 0.0
      ? evaluateSkyAndSun(vec3(refrDirB.x, max(refrDirB.y, 0.01), refrDirB.z), t).b
      : tirColor.b;
    transmittedSky = vec3(rCh, skyG.g, bCh);
    // Subtle prismatic cyan-amber highlight at the critical angle ring
    float rimGlow = smoothstep(0.16, 0.01, kG) * smoothstep(-0.01, 0.02, kR);
    transmittedSky += vec3(0.45, 0.85, 1.1) * rimGlow * 0.35;
  }

  // Blend in above-water 3D scene geometry (like emergent sea stacks / stone arch top) refracted through the wave
  vec2 snellRefrUV = clamp(uv + waveNormal.xz * 0.045, 0.001, 0.999);
  float refrDepth = texture(depthBuffer, snellRefrUV).x;
  if (refrDepth < 0.999) {
    vec3 refrWorld = worldPosFromDepth(snellRefrUV, refrDepth);
    if (refrWorld.y > hitPos.y + 0.1) {
      vec3 aboveScene = texture(inputBuffer, snellRefrUV).rgb;
      transmittedSky = mix(transmittedSky, aboveScene, 0.85);
    }
  }

  // Exact dielectric Fresnel reflectance approaching 1.0 at the critical angle (kG -> 0)
  float cosT = sqrt(max(kG, 0.0));
  float rPerp = (etaG * cosI - cosT) / max(etaG * cosI + cosT, 0.001);
  float rPar = (cosI - etaG * cosT) / max(cosI + etaG * cosT, 0.001);
  float fresnel = clamp(0.5 * (rPerp * rPerp + rPar * rPar), 0.0, 1.0);

  // Foam patches on wave crests overhead dim transmission slightly and scatter white light
  transmittedSky = mix(transmittedSky, vec3(0.9, 0.96, 1.0), crestFoam * 0.45);

  return mix(transmittedSky, tirColor, fresnel);
}

// ─── Above-Water Ocean Surface Shading (See-Through + Crest SSS + Reflections) ─

vec3 shadeTopWaterSurface(
  vec3 hitPos,
  float tHit,
  vec3 waveNormal,
  float crestFoam,
  vec3 rd,
  vec2 uv,
  float rawDepth,
  vec3 unrefractedWorldPos,
  vec3 refractedSunDir,
  float t
) {
  vec3 V = -rd;
  vec3 N = waveNormal;
  if (dot(V, N) < 0.02) {
    N = normalize(mix(N, V, 0.2));
  }

  // 1. Depth behind the water surface & Screen-Space Refraction
  bool origIsSky = rawDepth > 0.9995;
  float origWaterDepth = origIsSky ? 60.0 : max(0.0, hitPos.y - unrefractedWorldPos.y);

  // Scale UV refraction by water depth and inverse distance so shoreline contact has 0 offset
  float refrScale = clamp(origWaterDepth * 0.22, 0.0, 1.0) / max(tHit * 0.12 + 1.0, 1.0);
  vec2 refrOffset = N.xz * 0.055 * refrScale;
  vec2 refrUV = clamp(uv + refrOffset, 0.001, 0.999);

  float refrDepth = texture(depthBuffer, refrUV).x;
  vec3 underPos = unrefractedWorldPos;
  vec2 sampleUV = uv;
  bool underIsSky = origIsSky;

  if (refrDepth < 0.9995) {
    vec3 candidatePos = worldPosFromDepth(refrUV, refrDepth);
    // Guard against bleeding above-water objects into underwater refraction
    if (candidatePos.y < hitPos.y + 0.05) {
      underPos = candidatePos;
      sampleUV = refrUV;
      underIsSky = false;
    }
  }

  vec3 underScene = texture(inputBuffer, sampleUV).rgb;
  float verticalDepth = underIsSky ? 65.0 : max(0.0, hitPos.y - underPos.y);
  float uwPathLength = underIsSky ? 90.0 : length(underPos - hitPos);

  // 2. Underwater Caustics visible from above the water surface!
  if (!underIsSky && verticalDepth < 42.0) {
    vec3 dpdx = dFdx(underPos);
    vec3 dpdy = dFdy(underPos);
    vec3 geomN = length(dpdx) + length(dpdy) > 1e-4 ? normalize(cross(dpdx, dpdy)) : vec3(0.0, 1.0, 0.0);
    float sunFacing = smoothstep(0.05, 0.65, abs(geomN.y));
    vec3 caust = chromaticCaustics(underPos.xz, verticalDepth, refractedSunDir, t);
    underScene *= 1.0 + caust * sunFacing * 1.35;
  }

  // 3. Spectral Beer-Lambert Absorption + Depth Tint In-Scattering
  // Optical path combines view segment in water + vertical sunlight depth
  float opticalDist = uwPathLength * 0.85 + verticalDepth * 0.55;
  vec3 transmittance = exp(-uAbsorption * opticalDist);
  float scatterFactor = 1.0 - exp(-uFogDensity * 1.35 * opticalDist);

  float depth01 = clamp(verticalDepth / 32.0, 0.0, 1.0);
  vec3 waterTint = mix(uScatterShallow, uScatterDeep, pow(depth01, 0.7));
  // Shallow lagoon sand glow
  waterTint += uSunScatter * 0.14 * exp(-verticalDepth * 0.12);

  vec3 refractedUnderwater = underScene * transmittance + waterTint * scatterFactor;

  // 4. Subsurface Wave Crest Scattering (Unity Crest-style translucent emerald-cyan wave peaks)
  float crestElev = max(0.0, (hitPos.y - uWaterLevel) / max(uWaveHeight, 0.1));
  float backLight = pow(max(0.0, dot(uSunDir, -V) + 0.35 * (1.0 - N.y)), 3.0);
  float grazing = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0);
  vec3 sssCol = mix(uScatterShallow, uSunScatter, 0.55) * (0.28 + 0.72 * backLight) * crestElev * (0.35 + 0.65 * grazing);
  refractedUnderwater += sssCol * 0.48;

  // 5. Schlick Fresnel Reflection (Sky + Sun Specular Glints)
  float cosTheta = clamp(dot(N, V), 0.0, 1.0);
  float F0 = 0.0204; // ((1.333 - 1) / (1.333 + 1))^2
  float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);

  vec3 reflDir = reflect(-V, N);
  reflDir.y = max(reflDir.y, 0.01);
  vec3 skyRefl = evaluateSkyAndSun(reflDir, t);

  // Dual-lobe solar specular highlight (tight blinding core + sparkling wave facets)
  vec3 H = normalize(uSunDir + V);
  float NdotH = max(0.0, dot(N, H));
  float specCore = pow(NdotH, 320.0) * 3.8;
  float specSparkle = pow(NdotH, 42.0) * 0.38;
  vec3 sunSpec = vec3(1.0, 0.95, 0.84) * (specCore + specSparkle);

  vec3 surfaceCol = mix(refractedUnderwater, skyRefl, fresnel) + sunSpec;

  // 6. Shoreline / Object Intersection Contact Foam + Wave Crest Whitecaps
  float contactFoam = 0.0;
  if (!underIsSky && verticalDepth < 0.95) {
    float shoreNoise = fbm(hitPos.xz * 3.2 + vec2(t * 0.8, -t * 0.6));
    float ring = sin(verticalDepth * 14.0 - t * 3.5) * 0.5 + 0.5;
    float edgeBand = 1.0 - smoothstep(0.0, 0.9, verticalDepth);
    contactFoam = smoothstep(0.28, 0.75, edgeBand * (0.65 + 0.55 * shoreNoise + 0.25 * ring));
  }

  float totalFoam = clamp(crestFoam + contactFoam, 0.0, 1.0);
  vec3 foamColor = vec3(0.94, 0.98, 1.0) * (0.75 + 0.35 * max(0.2, uSunDir.y));
  surfaceCol = mix(surfaceCol, foamColor, totalFoam * 0.85);

  // Subtle atmospheric aerial perspective toward the distant horizon
  float horizonHaze = 1.0 - exp(-tHit * 0.0018);
  vec3 horizonSky = evaluateSkyAndSun(normalize(vec3(rd.x, max(rd.y, 0.02), rd.z)), t);
  return mix(surfaceCol, horizonSky, horizonHaze * 0.65);
}

// ─── Main Post-Processing Entry ─────────────────────────────────

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float t = uTime;
  float rawDepth = texture(depthBuffer, uv).x;
  bool isSky = rawDepth > 0.9995;

  vec3 worldPos = worldPosFromDepth(uv, rawDepth);
  vec3 toWorld = worldPos - cameraPos;
  float sceneDist = isSky ? 1000.0 : length(toWorld);
  vec3 rd = toWorld / max(sceneDist, 1e-4);

  // Refracted sun direction inside water (Snell's law air -> water)
  vec3 refractedSunDir = normalize(vec3(uSunDir.x * 0.75, max(uSunDir.y, 0.35), uSunDir.z * 0.75));

  // ── 1. Virtual Camera Lens Plane & 3D Wave Meniscus Classification ──
  // Reconstruct exact point on a virtual dome port 0.35m in front of the camera
  float lensForwardDist = 0.35;
  float forwardCos = max(dot(rd, uCameraForward), 0.25);
  vec3 lensPos = cameraPos + rd * (lensForwardDist / forwardCos);

  // Evaluate exact 3D wave height at the lens point + subtle capillary micro-ripple
  float lensWaveH = uWaterLevel + waveHeightGeometric(lensPos.xz, t);
  float lensCapillary = (valueNoise(vec2(uv.x * 9.0 + t * 0.6, t * 0.9)) - 0.5) * 0.006 * uWaveHeight;
  float signedLensHeight = lensPos.y - (lensWaveH + lensCapillary);

  // Meniscus capillary band half-thickness (in meters on the 0.35m dome port)
  float meniscusHalfBand = 0.016;
  bool pixelIsUnderwater = signedLensHeight < 0.0;

  // Apply capillary meniscus UV distortion right along the air-water boundary on the lens
  vec2 workingUV = uv;
  float meniscusFactor = 1.0 - smoothstep(0.0, meniscusHalfBand, abs(signedLensHeight));
  if (meniscusFactor > 0.001) {
    float meniscusSlope = signedLensHeight / meniscusHalfBand;
    workingUV.y = clamp(uv.y + meniscusSlope * 0.018 * meniscusFactor, 0.001, 0.999);
  }

  // Apply subtle emergence lens wetness droplets when camera recently breached into air
  if (!pixelIsUnderwater && uWetness > 0.01) {
    vec2 dropUV = uv * vec2(uAspect * 7.0, 7.0) + vec2(0.0, t * 0.45);
    float dropN = valueNoise(dropUV) * valueNoise(dropUV * 2.3 + 13.7);
    float droplet = smoothstep(0.32, 0.65, dropN) * uWetness;
    workingUV = clamp(workingUV + vec2(dFdx(droplet), dFdy(droplet)) * 0.12, 0.001, 0.999);
  }

  if (workingUV != uv) {
    rawDepth = texture(depthBuffer, workingUV).x;
    isSky = rawDepth > 0.9995;
    worldPos = worldPosFromDepth(workingUV, rawDepth);
    toWorld = worldPos - cameraPos;
    sceneDist = isSky ? 1000.0 : length(toWorld);
    rd = toWorld / max(sceneDist, 1e-4);
  }

  vec3 baseSceneColor = texture(inputBuffer, workingUV).rgb;

  // Distance from lensPos to scene geometry
  float lensToCam = length(lensPos - cameraPos);
  float maxRayDistFromLens = max(0.0, sceneDist - lensToCam);

  // ── 2. Intersect View Ray with 3D Gerstner Wave Surface ──
  float tSurfFromLens = 0.0;
  bool hitWaterSurface = intersectWaveSurface(
    lensPos,
    rd,
    signedLensHeight,
    min(maxRayDistFromLens, 550.0),
    t,
    tSurfFromLens
  );
  float tSurf = tSurfFromLens + lensToCam;
  vec3 surfHitPos = cameraPos + rd * tSurf;

  vec3 finalColor = baseSceneColor;

  // ════════════════════════════════════════════════════════════════
  // BRANCH A: PIXEL STARTS ABOVE WATER (IN AIR)
  // ════════════════════════════════════════════════════════════════
  if (!pixelIsUnderwater) {
    if (hitWaterSurface && tSurf < sceneDist) {
      // Ray from air hit the top of the 3D ocean surface!
      float surfY;
      vec3 surfNormal;
      float crestFoam;
      evaluateWaveSurface(surfHitPos.xz, tSurf, t, surfY, surfNormal, crestFoam);

      finalColor = shadeTopWaterSurface(
        surfHitPos,
        tSurf,
        surfNormal,
        crestFoam,
        rd,
        workingUV,
        rawDepth,
        worldPos,
        refractedSunDir,
        t
      );
    } else if (!isSky) {
      // Dry above-water geometry (pillars, arch top, sea stacks):
      // Add a darkened wet-rock shoreline band just above the current wave height
      float localWaveY = uWaterLevel + waveHeightGeometric(worldPos.xz, t);
      float heightAboveWave = worldPos.y - localWaveY;
      if (heightAboveWave > -0.1 && heightAboveWave < 0.95) {
        float wetMask = 1.0 - smoothstep(0.0, 0.95, max(0.0, heightAboveWave));
        finalColor *= mix(1.0, 0.58, wetMask * 0.75);
      }
      // Subtle atmospheric perspective on distant rocks
      float airFog = 1.0 - exp(-sceneDist * 0.0012);
      finalColor = mix(finalColor, evaluateSkyAndSun(rd, t), airFog * 0.5);
    } else {
      // Sky above water: enhance sun disk & atmospheric bloom dispersal
      vec3 skyEnh = evaluateSkyAndSun(rd, t);
      finalColor = mix(baseSceneColor, skyEnh, 0.65);
    }
  }
  // ════════════════════════════════════════════════════════════════
  // BRANCH B: PIXEL STARTS UNDERWATER
  // ════════════════════════════════════════════════════════════════
  else {
    float camDepth = max(0.0, uWaterLevel - cameraPos.y);
    float camDepth01 = clamp(camDepth / 38.0, 0.0, 1.0);

    // Subtle underwater heat-like turbulence refraction (depth-guarded)
    vec2 uwDistort = vec2(
      valueNoise(workingUV * 7.5 + vec2(t * 0.35, -t * 0.22)) - 0.5,
      valueNoise(workingUV * 7.5 + vec2(-t * 0.25, t * 0.38) + 31.4) - 0.5
    ) * 0.0028;
    vec2 uwUV = clamp(workingUV + uwDistort, 0.001, 0.999);
    float uwDepthCheck = texture(depthBuffer, uwUV).x;
    if (abs(uwDepthCheck - rawDepth) < 0.025) {
      baseSceneColor = texture(inputBuffer, uwUV).rgb;
    }

    vec3 targetRadiance = vec3(0.0);
    float waterTravelDist = sceneDist;

    if (hitWaterSurface && tSurf < sceneDist) {
      // Underwater ray hit the UNDERSIDE of the 3D wave surface -> Snell's Window & TIR!
      float surfY;
      vec3 surfNormal;
      float crestFoam;
      evaluateWaveSurface(surfHitPos.xz, tSurf, t, surfY, surfNormal, crestFoam);

      targetRadiance = shadeUndersideWaterSurface(
        surfHitPos,
        surfNormal,
        crestFoam,
        rd,
        workingUV,
        camDepth01,
        refractedSunDir,
        t
      );
      waterTravelDist = tSurf;
    } else if (isSky) {
      // Open horizontal/downward water background -> infinite water path
      waterTravelDist = 160.0;
      targetRadiance = vec3(0.0);
    } else {
      // Underwater 3D Geometry (seabed, coral reef, stone arch, kelp, whale, manta rays)
      float geomDepthBelow = max(0.0, uWaterLevel - worldPos.y);

      // Reconstruct geometry surface normal for directional caustics
      vec3 dpdx = dFdx(worldPos);
      vec3 dpdy = dFdy(worldPos);
      vec3 geomNormal = (length(dpdx) + length(dpdy) > 1e-4)
        ? normalize(cross(dpdx, dpdy))
        : vec3(0.0, 1.0, 0.0);

      // Upward / sun-facing alignment for caustics
      float upAlign = smoothstep(0.05, 0.65, abs(geomNormal.y));
      vec3 caust = chromaticCaustics(worldPos.xz, geomDepthBelow, refractedSunDir, t);

      // Modulate caustics by surface albedo + ambient sun penetration
      vec3 sunlitGeom = baseSceneColor * (1.0 + caust * upAlign * 1.45);

      // Vertical depth Beer-Lambert ambient attenuation on the object itself
      vec3 verticalAtten = exp(-uAbsorption * (geomDepthBelow * 0.28));
      targetRadiance = sunlitGeom * mix(vec3(1.0), verticalAtten, 0.65);
    }

    // ── Spectral Beer-Lambert Absorption + In-Scattering along the view ray ──
    vec3 rayTransmittance = exp(-uAbsorption * waterTravelDist * 0.55);
    float inScatterFactor = 1.0 - exp(-uFogDensity * 1.45 * waterTravelDist);
    vec3 waterScatter = computeWaterScatterColor(rd, camDepth01, refractedSunDir);

    finalColor = targetRadiance * rayTransmittance + waterScatter * inScatterFactor;

    // ── Volumetric God Rays (Light Shafts) ──
    vec3 godRayLight = computeVolumetricGodRays(
      cameraPos,
      rd,
      workingUV,
      waterTravelDist,
      refractedSunDir,
      t
    );
    finalColor += godRayLight * (1.0 - camDepth01 * 0.45);

    // Subtle underwater depth vignette
    vec2 centered = uv * 2.0 - 1.0;
    finalColor *= 1.0 - dot(centered, centered) * 0.08;
  }

  // ════════════════════════════════════════════════════════════════
  // MENISCUS WATERLINE RIBBON COMPOSITE
  // ════════════════════════════════════════════════════════════════
  if (meniscusFactor > 0.001) {
    // Glass dome capillary waterline highlight + cyan refractive tint
    float coreLine = exp(-pow(signedLensHeight / (meniscusHalfBand * 0.28), 2.0));
    float upperEdge = exp(-pow((signedLensHeight - meniscusHalfBand * 0.45) / (meniscusHalfBand * 0.22), 2.0));
    vec3 meniscusTint = mix(uScatterShallow, vec3(0.75, 0.96, 1.0), 0.55);

    finalColor = mix(finalColor, finalColor * meniscusTint * 1.15, meniscusFactor * 0.55);
    finalColor += vec3(0.85, 0.97, 1.0) * coreLine * 0.75;
    finalColor += vec3(1.0, 0.95, 0.85) * upperEdge * 0.35;
  }

  // Blue-noise dither to prevent 8-bit banding in smooth underwater gradients
  finalColor += (ign(gl_FragCoord.xy) - 0.5) / 255.0;

  outputColor = vec4(max(finalColor, vec3(0.0)), 1.0);
}
