// Unified Ocean + Underwater Post-Processing Shader
// Inspired by Sea of Thieves, Assassin's Creed IV: Black Flag, Subnautica & Abzû.
// Features:
// - Analytical 10-wave Gerstner/Trochoidal wave spectrum with exact band-limited derivatives (zero pixelation)
// - Sea of Thieves translucent jade/turquoise wave-crest subsurface scattering (SSS) & deep trough contrast
// - Wind-streaked noise foam with eroding holes on wave crests + shoaling surf & breaking splash rings around obstacles
// - Wave-height-dependent water opacity / turbidity from above the surface
// - Energy-conserving Beer-Lambert absorption + Henyey-Greenstein in-scattering (no horizon whiteout)
// - Volumetric god-ray light shafts integrated along the view ray, sharing one sunlight pattern with
//   the underside of the surface and the caustics + Snell's window with dispersion & TIR
// - Smooth camera dome waterline meniscus

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

// ─── Smooth Band-Limited Noise & Cellular Web Functions ─────────

float ign(vec2 p) {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Quintic C2-continuous value noise (smooth 1st and 2nd derivatives -> zero blocky artifacts)
float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbmSmooth(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * smoothNoise(p);
    p = rot * p * 2.02 + vec2(17.3, 29.1);
    a *= 0.5;
  }
  return v;
}

// Round holes of mixed size on a jittered grid: the gaps that open in thinning sea foam.
// Returns 1 inside a hole. Distance to the nearest point (not cell edges), so there are
// no straight honeycomb walls.
float foamHoles(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float hole = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      float radius = 0.16 + 0.36 * hash21(n + g + 7.7);
      float d = length(g + o - f);
      hole = max(hole, 1.0 - smoothstep(radius * 0.7, radius, d));
    }
  }
  return hole;
}

// Foam coverage for a given whitecap energy. Noise patches stretched along the wind are
// eroded by a threshold: little energy leaves torn streaks full of holes, a lot fills in
// solid whitewater. A domain warp keeps the pattern from repeating or lining up.
float evaluateLacyFoam(vec2 xz, float rawIntensity, float distToCam, float t) {
  if (rawIntensity <= 0.01) return 0.0;
  float detailFade = exp(-distToCam * 0.012);
  vec2 drift = vec2(t * 0.32, t * 0.18);

  vec2 warp = vec2(
    smoothNoise(xz * 0.19 + vec2(3.1, t * 0.07)) + 0.5 * smoothNoise(xz * 0.47 + vec2(t * 0.09, 1.7)),
    smoothNoise(xz * 0.19 + vec2(t * 0.06, 8.7)) + 0.5 * smoothNoise(xz * 0.47 + vec2(6.3, -t * 0.08))
  ) - 0.75;
  vec2 p = xz + warp * 3.4;

  // Wind frame: x runs along the primary swell, so patches trail downwind
  vec2 w = mat2(0.86, -0.51, 0.51, 0.86) * p;
  float patches = fbmSmooth(w * vec2(0.2, 0.55) + drift * 0.35);
  float streaks = fbmSmooth(w * vec2(0.45, 1.9) - drift * 0.2 + 11.0);
  float density = mix(patches, patches * 0.62 + streaks * 0.38, detailFade);

  float cover = density + (rawIntensity - 0.36) * 0.9;
  float foam = smoothstep(0.5, 0.68, cover);
  if (foam <= 0.001) return 0.0;

  // Holes eat thin foam first; thick foam stays closed
  float holes = max(
    foamHoles(p * 1.6 + drift),
    foamHoles(p * 4.1 - drift * 1.3 + 5.0) * 0.85
  );
  float thick = smoothstep(0.66, 1.05, cover);
  foam *= 1.0 - holes * (1.0 - thick) * 0.92 * detailFade;
  // Far away the holes are smaller than a pixel: keep their average darkening instead
  foam *= mix(0.62 + 0.38 * thick, 1.0, detailFade);

  return clamp(foam, 0.0, 1.0);
}

// ─── World Position Reconstruction ──────────────────────────────

vec3 worldPosFromDepth(vec2 uv, float depth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 viewPos = uInvProjection * clip;
  viewPos /= viewPos.w;
  vec4 worldPos = uInvView * viewPos;
  return worldPos.xyz;
}

float linearViewDepth(float depth) {
  return uCameraNear * uCameraFar / (uCameraFar - depth * (uCameraFar - uCameraNear));
}

// ─── Analytical Multi-Wave Trochoidal / Gerstner Ocean Spectrum ─
// Each wave uses the trochoidal profile:
//   phase = dot(k, p) + speed * t
//   u = phase + c * cos(phase)
//   h = A * sin(u)
//   dh/dp = k * A * cos(u) * (1 - c * sin(phase))
//   compression = A * kLen * sin(u) * c  (peaks at sharp wave crests!)
// Because derivatives are 100% analytical and band-limited by distance,
// there is zero finite-difference noise and zero pixelation.

void addTrochoidalWave(
  vec2 p,
  vec2 dir,
  float freq,
  float amp,
  float speed,
  float chop,
  float bandWeight,
  float t,
  inout float totalH,
  inout vec2 totalGrad,
  inout float totalCrest
) {
  float a = amp * bandWeight;
  if (a < 1e-4) return;
  float phase = dot(dir, p) * freq + t * speed;
  float s0 = sin(phase);
  float c0 = cos(phase);
  float u = phase + chop * c0;
  float su = sin(u);
  float cu = cos(u);

  totalH += a * su;
  float du_dphase = 1.0 - chop * s0;
  totalGrad += dir * (freq * a * cu * du_dphase);
  // Crest compression peaks when su > 0 and wave is steep
  totalCrest += max(0.0, su) * (freq * a * (0.6 + chop));
}

float waveHeightGeometric(vec2 p, float t) {
  float h = 0.0;
  float c = clamp(0.32 * uWaveChoppiness, 0.05, 0.58);

  // 1. Primary rolling ocean swells (Sea of Thieves broad rhythmic rollers)
  float p1 = (p.x * 0.86 + p.y * 0.51) * 0.085 + t * 0.92;
  h += sin(p1 + c * cos(p1)) * 0.52;

  float p2 = (-p.x * 0.58 + p.y * 0.81) * 0.095 - t * 0.78;
  h += sin(p2 + c * cos(p2)) * 0.38;

  // 2. Cross-swells creating diamond interference peaks
  float p3 = (p.x * 0.76 - p.y * 0.65) * 0.21 + t * 1.42;
  h += sin(p3 + c * 0.85 * cos(p3)) * 0.22;

  float p4 = (p.x * 0.42 + p.y * 0.91) * 0.26 - t * 1.25;
  h += sin(p4 + c * 0.85 * cos(p4)) * 0.16;

  // 3. Wind-driven chop
  float p5 = (p.x * 0.93 + p.y * 0.37) * 0.52 + t * 2.15;
  h += sin(p5 + c * 0.6 * cos(p5)) * 0.09;

  float p6 = (p.x * 0.64 - p.y * 0.77) * 0.68 - t * 1.95;
  h += sin(p6 + c * 0.6 * cos(p6)) * 0.065;

  return h * uWaveHeight;
}

// Analytical surface evaluation with band-limited multi-scale ripples & obstacle shoaling
void evaluateWaveSurface(
  vec2 xz,
  float distToCam,
  float verticalWaterDepth,
  float t,
  out float height,
  out vec3 normal,
  out float foamCoverage,
  out float crestFactor
) {
  float c = clamp(0.32 * uWaveChoppiness, 0.05, 0.58);
  float totalH = 0.0;
  vec2 totalGrad = vec2(0.0);
  float totalCrest = 0.0;

  // Distance band-limiting weights (automatic anti-aliasing of shorter wavelengths)
  float wSwell = 1.0;
  float wMed = exp(-distToCam * 0.0025);
  float wChop = exp(-distToCam * 0.008);
  float wRipple = exp(-distToCam * 0.022);

  // Shoaling boost: waves steepen Slightly as they enter shallow water (< 4m)
  float shoalBoost = 1.0 + 0.28 * exp(-max(0.0, verticalWaterDepth) * 0.45);

  // Octave 1-2: Primary Swells
  addTrochoidalWave(xz, vec2(0.86, 0.51), 0.085, 0.52 * uWaveHeight, 0.92, c, wSwell, t, totalH, totalGrad, totalCrest);
  addTrochoidalWave(xz, vec2(-0.58, 0.81), 0.095, 0.38 * uWaveHeight, -0.78, c, wSwell, t, totalH, totalGrad, totalCrest);

  // Octave 3-4: Cross-Swells
  addTrochoidalWave(xz, vec2(0.76, -0.65), 0.21, 0.22 * uWaveHeight, 1.42, c * 0.85, wMed * shoalBoost, t, totalH, totalGrad, totalCrest);
  addTrochoidalWave(xz, vec2(0.42, 0.91), 0.26, 0.16 * uWaveHeight, -1.25, c * 0.85, wMed * shoalBoost, t, totalH, totalGrad, totalCrest);

  // Octave 5-6: Medium Chop
  addTrochoidalWave(xz, vec2(0.93, 0.37), 0.52, 0.09 * uWaveHeight, 2.15, c * 0.65, wChop * shoalBoost, t, totalH, totalGrad, totalCrest);
  addTrochoidalWave(xz, vec2(0.64, -0.77), 0.68, 0.065 * uWaveHeight, -1.95, c * 0.65, wChop * shoalBoost, t, totalH, totalGrad, totalCrest);

  // Octave 7-10: Fine Silky Capillary Ripples (analytical derivatives -> zero pixelation!)
  addTrochoidalWave(xz, vec2(0.81, 0.59), 1.45, 0.028 * uWaveHeight, 3.2, 0.25, wRipple, t, totalH, totalGrad, totalCrest);
  addTrochoidalWave(xz, vec2(-0.72, 0.69), 1.85, 0.021 * uWaveHeight, -2.9, 0.25, wRipple, t, totalH, totalGrad, totalCrest);
  addTrochoidalWave(xz, vec2(0.35, -0.94), 2.95, 0.012 * uWaveHeight, 4.1, 0.20, wRipple, t, totalH, totalGrad, totalCrest);
  addTrochoidalWave(xz, vec2(0.95, -0.31), 4.30, 0.007 * uWaveHeight, -4.8, 0.15, wRipple * 0.8, t, totalH, totalGrad, totalCrest);

  height = uWaterLevel + totalH;
  normal = normalize(vec3(-totalGrad.x, 1.0, -totalGrad.y));

  // Normalized crest elevation + steepness for SSS and whitecap generation
  float normElev = clamp((totalH / max(uWaveHeight, 0.15) + 0.3) * 0.75, 0.0, 1.5);
  crestFactor = clamp(normElev * 0.65 + totalCrest * 2.2, 0.0, 1.5);

  // Whitecap foam forms on steep colliding wave peaks (scaled by wave height & choppiness)
  float waveEnergy = clamp(uWaveHeight * (0.65 + 0.35 * uWaveChoppiness), 0.2, 2.5);
  float rawWhitecap = max(0.0, totalCrest * 3.8 * waveEnergy - 0.38)
                    + max(0.0, (1.0 - normal.y) * 3.2 - 0.28) * waveEnergy;
  foamCoverage = evaluateLacyFoam(xz, rawWhitecap, distToCam, t);
}

float signedHeightAboveWaves(vec3 pos, float t) {
  return pos.y - (uWaterLevel + waveHeightGeometric(pos.xz, t));
}

// ─── Exact Ray-Wave Heightfield Intersection ────────────────────

bool intersectWaveSurface(vec3 ro, vec3 rd, float s0, float maxDist, float t, out float tHit) {
  float maxAmp = 1.55 * uWaveHeight + 0.12;
  float targetSign = s0 >= 0.0 ? 1.0 : -1.0;

  bool bracketFound = false;
  float ta = 0.0;
  float tb = 0.0;
  float fa = s0;
  float fb = s0;

  // 1. Near-field high-resolution march when camera is near the wave band
  if (abs(ro.y - uWaterLevel) < maxAmp + 3.5) {
    float nearMax = min(maxDist, 42.0);
    float prevT = 0.0;
    float prevF = s0;
    for (int i = 1; i <= 14; i++) {
      float frac = float(i) / 14.0;
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
        for (int i = 1; i <= 12; i++) {
          float curT = mix(tEnter, tExit, float(i) / 12.0);
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
        for (int i = 1; i <= 12; i++) {
          float curT = mix(tEnter, tExit, float(i) / 12.0);
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

  // 3. Guarded Secant + Bisection refinement (6 iterations -> sub-mm precision)
  for (int k = 0; k < 6; k++) {
    float denom = fb - fa;
    float tMid = abs(denom) > 1e-5
      ? clamp(ta - fa * (tb - ta) / denom, mix(ta, tb, 0.15), mix(ta, tb, 0.85))
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

// ─── Analytical Sky & Solar Radiance ────────────────────────────

vec3 evaluateSkyAndSun(vec3 dir, float t) {
  float y = max(dir.y, 0.0);
  vec3 zenithCol = vec3(0.14, 0.44, 0.84);
  vec3 horizonCol = vec3(0.62, 0.82, 0.94);
  vec3 warmHorizon = vec3(0.94, 0.78, 0.60);

  vec2 hDir = normalize(vec2(dir.x, dir.z) + vec2(1e-5));
  vec2 hSun = normalize(vec2(uSunDir.x, uSunDir.z) + vec2(1e-5));
  float sunAzimuthAlign = pow(max(0.0, dot(hDir, hSun)), 2.0);
  vec3 hCol = mix(horizonCol, warmHorizon, sunAzimuthAlign * 0.4);
  vec3 sky = mix(hCol, zenithCol, pow(y, 0.55));

  if (dir.y > 0.03) {
    vec2 cloudUV = dir.xz / (dir.y + 0.2) * 0.32 + vec2(t * 0.007, -t * 0.004);
    float cl = fbmSmooth(cloudUV * 2.0);
    float cloudMask = smoothstep(0.50, 0.78, cl) * smoothstep(0.03, 0.24, dir.y);
    vec3 cloudCol = mix(vec3(0.94, 0.97, 1.0), vec3(1.0, 0.88, 0.76), pow(max(0.0, dot(dir, uSunDir)), 3.0));
    sky = mix(sky, cloudCol, cloudMask * 0.4);
  }

  float cosSun = max(0.0, dot(dir, uSunDir));
  sky += vec3(1.0, 0.85, 0.60) * pow(cosSun, 8.0) * 0.35;
  sky += vec3(1.0, 0.92, 0.78) * pow(cosSun, 64.0) * 1.1;
  sky += vec3(1.8, 1.65, 1.35) * smoothstep(0.9985, 0.9998, cosSun) * 2.8;

  return sky;
}

// ─── Bounded Underwater Scatter Color (Prevents Horizon Whiteout!) ─
// Ensures background water fog stays rich, deep, and below the Bloom threshold (0.78)
// so the horizon never blows out to white.

vec3 computeWaterScatterColor(vec3 rd, float camDepth01, vec3 refractedSunDir) {
  // Smooth vertical gradient: deep abyssal blue looking down, rich teal/turquoise looking up
  float upLook = smoothstep(-0.65, 0.85, rd.y);
  float shallowMix = clamp((1.0 - camDepth01 * 0.82) * (0.28 + 0.62 * upLook), 0.0, 1.0);
  vec3 baseScatter = mix(uScatterDeep, uScatterShallow * 0.78, shallowMix);

  // Bounded Henyey-Greenstein forward solar scattering (clamped so it never washes out to white)
  float cosTheta = max(0.0, dot(rd, refractedSunDir));
  float forwardLobe = pow(cosTheta, 4.5) * 0.28 + pow(cosTheta, 1.5) * 0.10;
  float sunDepthAtten = exp(-camDepth01 * 1.8);
  baseScatter += uSunScatter * forwardLobe * sunDepthAtten;

  // Guarantee scatter stays saturated and below bloom threshold
  return min(baseScatter, vec3(0.52, 0.68, 0.72));
}

// ─── Energy-Conserving Underwater Radiative Transfer ────────────
// Combines Beer-Lambert spectral absorption AND particulate scattering
// into a single monotonic extinction curve so distant geometry & horizon
// converge 100% seamlessly to `waterScatter` with zero bright band.

vec3 applyUnderwaterOptics(vec3 objectRadiance, vec3 waterScatter, float dist) {
  // Effective per-channel extinction = spectral absorption + particulate fog density
  vec3 sigmaExt = uAbsorption * 0.65 + vec3(uFogDensity * 1.65 + 0.012);
  vec3 transmittance = exp(-sigmaExt * dist);
  return mix(waterScatter, objectRadiance, transmittance);
}

// ─── Chromatic Cellular-Wave Caustics (Zero Facet Artifacts) ────

float causticFilaments(vec2 p, float t) {
  mat2 m1 = mat2(0.84, -0.54, 0.54, 0.84);
  mat2 m2 = mat2(0.62, 0.78, -0.78, 0.62);

  vec2 warp = vec2(
    sin(p.y * 0.75 + t * 0.65),
    cos(p.x * 0.80 - t * 0.55)
  ) * 0.38;
  vec2 q = p + warp;

  vec2 q1 = m1 * q * 1.15 + vec2(t * 0.42, -t * 0.31);
  vec2 q2 = m2 * q * 1.48 + vec2(-t * 0.38, t * 0.47);

  float r1 = 1.0 - abs(sin(q1.x + sin(q1.y * 1.3 + t * 0.5) * 0.85));
  float r2 = 1.0 - abs(sin(q1.y - cos(q1.x * 1.2 - t * 0.4) * 0.85));
  float r3 = 1.0 - abs(sin(q2.x + sin(q2.y * 1.1 - t * 0.6) * 0.75));
  float r4 = 1.0 - abs(sin(q2.y + cos(q2.x * 1.3 + t * 0.5) * 0.75));

  float netA = pow(clamp(r1 * r2, 0.0, 1.0), 2.6);
  float netB = pow(clamp(r3 * r4, 0.0, 1.0), 2.6);

  float focalPeaks = pow(netA * netB, 0.42) * 2.8;
  float web = (netA + netB) * 0.42;
  return clamp(focalPeaks + web, 0.0, 2.4);
}

vec3 chromaticCaustics(vec2 worldXZ, float depthBelowSurface, vec3 refractedSunDir, float t) {
  vec2 projXZ = worldXZ + refractedSunDir.xz * (depthBelowSurface / max(refractedSunDir.y, 0.22));
  vec2 scaleP = projXZ * mix(0.8, 1.2, uWaterClarity);

  vec2 dispDir = normalize(refractedSunDir.xz + vec2(0.001)) * clamp(depthBelowSurface * 0.007, 0.015, 0.075);

  float cR = causticFilaments(scaleP - dispDir, t);
  float cG = causticFilaments(scaleP, t);
  float cB = causticFilaments(scaleP + dispDir, t);

  float focusRamp = smoothstep(0.05, 1.2, depthBelowSurface);
  vec3 depthTransmittance = exp(-uAbsorption * depthBelowSurface * 0.38);

  return vec3(cR, cG, cB) * focusRamp * depthTransmittance * uCausticsIntensity;
}

// ─── Sunlight Pattern Below the Surface ─────────────────────────
// One field, indexed by the point where a sun ray crossed the surface. The underside of the
// surface, the light shafts and the light on submerged geometry all read it, so a shaft
// starts at a bright patch of the surface and ends on a bright patch of the floor.

vec2 sunEntryXZ(vec3 pos, vec3 refractedSunDir) {
  float depth = max(uWaterLevel - pos.y, -2.0);
  return pos.xz + refractedSunDir.xz * (depth / max(refractedSunDir.y, 0.22));
}

// The four swells of waveHeightGeometric, scaled to about -1..1: crests gather light.
float swellLens(vec2 p, float t) {
  float c = clamp(0.32 * uWaveChoppiness, 0.05, 0.58);
  float p1 = (p.x * 0.86 + p.y * 0.51) * 0.085 + t * 0.92;
  float p2 = (-p.x * 0.58 + p.y * 0.81) * 0.095 - t * 0.78;
  float p3 = (p.x * 0.76 - p.y * 0.65) * 0.21 + t * 1.42;
  float p4 = (p.x * 0.42 + p.y * 0.91) * 0.26 - t * 1.25;
  return (sin(p1 + c * cos(p1)) * 0.52 + sin(p2 + c * cos(p2)) * 0.38
        + sin(p3 + c * 0.85 * cos(p3)) * 0.22 + sin(p4 + c * 0.85 * cos(p4)) * 0.16) / 0.9;
}

// Thin bright lines of a warped grid: the net of light seen on the underside of the surface.
float lightNet(vec2 p, float t) {
  vec2 warp = vec2(sin(p.y * 0.75 + t * 0.65), cos(p.x * 0.80 - t * 0.55)) * 0.38;
  vec2 q = mat2(0.84, -0.54, 0.54, 0.84) * (p + warp) * 1.15 + vec2(t * 0.42, -t * 0.31);
  float a = 1.0 - abs(sin(q.x + sin(q.y * 1.3 + t * 0.5) * 0.85));
  float b = 1.0 - abs(sin(q.y - cos(q.x * 1.2 - t * 0.4) * 0.85));
  return pow(max(a, b), 7.0);
}

// `fine` fades the narrow shafts out where the caller cannot resolve them (far march steps).
float sunShaftPattern(vec2 surfXZ, float t, float fine) {
  float f1 = causticFilaments(surfXZ * 0.28, t * 0.48);
  float f2 = causticFilaments(surfXZ * 0.72 + vec2(7.4, 3.2), t * 0.62);
  // High-power contrast curve separates bright beams from dark intervals
  float beam1 = pow(clamp(f1 * 0.58, 0.0, 1.2), 3.2);
  float beam2 = pow(clamp(f2 * 0.55, 0.0, 1.2), 3.6);
  float lens = smoothstep(-0.9, 0.9, swellLens(surfXZ, t));
  return (beam1 * 1.35 + beam2 * 1.15 * fine) * (0.45 + 0.85 * lens);
}

// ─── Analytical Scene Blocker Occlusion for Volumetric God Rays ─

float sampleSunBlockerOcclusion(vec3 pos, vec3 sunRayDir) {
  if (abs(sunRayDir.z) > 0.02) {
    float tArch = (-8.0 - pos.z) / sunRayDir.z;
    if (tArch > 0.0 && tArch < 45.0) {
      vec3 hit = pos + sunRayDir * tArch;
      vec2 archRel = vec2(hit.x, (hit.y - 26.0) * 0.85);
      float r = length(archRel);
      if (hit.y > 20.0 && r > 8.8 && r < 14.8) {
        return 0.08;
      }
    }
  }

  vec2 sunXZ = normalize(sunRayDir.xz + vec2(1e-4));
  vec2 toSpire1 = vec2(-22.0, -16.0) - pos.xz;
  float proj1 = dot(toSpire1, sunXZ);
  if (proj1 > 0.0 && proj1 < 40.0) {
    float perpDist1 = length(toSpire1 - sunXZ * proj1);
    if (perpDist1 < 5.2) return 0.1;
  }

  vec2 toSpire2 = vec2(24.0, -20.0) - pos.xz;
  float proj2 = dot(toSpire2, sunXZ);
  if (proj2 > 0.0 && proj2 < 45.0) {
    float perpDist2 = length(toSpire2 - sunXZ * proj2);
    if (perpDist2 < 5.8) return 0.1;
  }

  return 1.0;
}

// ─── High-Contrast Volumetric God Rays (Light Shafts) ───────────
// Produces distinct, radiant sunbeams cutting through the water column.

vec3 computeVolumetricGodRays(
  vec3 ro,
  vec3 rd,
  vec2 uv,
  float maxRayDist,
  vec3 refractedSunDir,
  float t
) {
  if (uGodRayIntensity <= 0.001) return vec3(0.0);

  // Integrate in-scattered sunlight along the view ray: a fish two metres away has two
  // metres of lit water in front of it, not the average brightness of a long ray. Steps grow
  // with distance, and the view extinction fades far shafts out instead of cutting them off.
  float marchDist = min(maxRayDist, 70.0);
  const int NUM_STEPS = 26;
  // White noise: without temporal filtering, interleaved gradient noise shows as hatching
  float jitter = hash21(gl_FragCoord.xy + 0.5);
  vec3 sigmaView = (uAbsorption * 0.65 + vec3(uFogDensity * 1.65 + 0.012)) * 0.55;

  vec3 accumVolumetric = vec3(0.0);

  for (int i = 0; i < NUM_STEPS; i++) {
    float u = (float(i) + jitter) / float(NUM_STEPS);
    float marchT = marchDist * u * (0.3 + 0.7 * u);
    float stepLen = marchDist * (0.3 + 1.4 * u) / float(NUM_STEPS);
    vec3 samplePos = ro + rd * marchT;
    float depthBelow = uWaterLevel - samplePos.y;

    if (depthBelow > -1.0 && depthBelow < 55.0) {
      float effDepth = max(0.0, depthBelow);
      // Points along the same sun ray share one entry point -> crisp parallel shafts
      // Narrow shafts only where the steps are short enough to resolve them
      float shaftFocus = sunShaftPattern(sunEntryXZ(samplePos, refractedSunDir), t, smoothstep(2.6, 0.9, stepLen));
      float blocker = sampleSunBlockerOcclusion(samplePos, refractedSunDir);

      // Spectral attenuation from surface + view distance
      vec3 sunAtten = exp(-uAbsorption * (effDepth * 0.22)) * exp(-sigmaView * marchT);
      float depthEnvelope = smoothstep(52.0, 0.0, effDepth);

      accumVolumetric += sunAtten * (shaftFocus * blocker * depthEnvelope * stepLen);
    }
  }

  // Directional scattering boost: strong forward scatter toward sun, clear visibility from side angles
  float cosSun = dot(rd, refractedSunDir);
  float phaseBoost = 0.65 + 1.1 * pow(max(0.0, cosSun), 2.2) + 0.55 * smoothstep(-0.25, 0.75, rd.y);
  vec3 shaftColor = mix(uScatterShallow, uSunScatter, 0.65) + vec3(0.18, 0.24, 0.16);
  vec3 worldShafts = accumVolumetric * shaftColor * phaseBoost * 0.075;

  // Screen-Space Radial Crepuscular Shafts when looking toward the sun / Snell's window
  vec3 radialShafts = vec3(0.0);
  if (cosSun > 0.02) {
    vec4 sunClip = uViewProjection * vec4(cameraPos + refractedSunDir * 100.0, 1.0);
    if (sunClip.w > 0.0) {
      vec2 sunUV = (sunClip.xy / sunClip.w) * 0.5 + 0.5;
      vec2 deltaUV = sunUV - uv;
      float screenDist = length(deltaUV);
      vec2 stepUV = deltaUV / 12.0;

      float radialAccum = 0.0;
      for (int j = 1; j <= 12; j++) {
        vec2 sUV = uv + stepUV * (float(j) + jitter * 0.5 - 0.25);
        if (sUV.x >= 0.0 && sUV.x <= 1.0 && sUV.y >= 0.0 && sUV.y <= 1.0) {
          float dSample = texture(depthBuffer, sUV).x;
          float openWater = smoothstep(0.90, 0.999, dSample);
          radialAccum += openWater * (1.0 - float(j) / 14.0);
        }
      }
      radialAccum /= 12.0;
      float radialFalloff = exp(-screenDist * 1.4) * pow(max(0.0, cosSun), 1.6);
      // Glow builds up with the water in front of the pixel, so near objects stay clear of it
      radialShafts = shaftColor * radialAccum * radialFalloff * 0.6 * (1.0 - exp(-maxRayDist * 0.08));
    }
  }

  return (worldShafts + radialShafts) * uGodRayIntensity;
}

// ─── Snell's Window & Underside Wave Shading ────────────────────

vec3 shadeUndersideWaterSurface(
  vec3 hitPos,
  float tHit,
  vec3 waveNormal,
  float foamCoverage,
  float crestFactor,
  vec3 rd,
  vec2 uv,
  float camDepth01,
  vec3 refractedSunDir,
  vec3 baseWaterScatter,
  float t
) {
  vec3 N = -waveNormal;
  if (dot(rd, N) > -0.02) {
    N = normalize(mix(N, -rd, 0.18));
  }

  float cosI = clamp(dot(-rd, N), 0.0, 1.0);

  const float etaR = 1.329;
  const float etaG = 1.333;
  const float etaB = 1.338;

  float sin2I = max(0.0, 1.0 - cosI * cosI);
  float kR = 1.0 - etaR * etaR * sin2I;
  float kG = 1.0 - etaG * etaG * sin2I;
  float kB = 1.0 - etaB * etaB * sin2I;

  // Total Internal Reflection (Liquid mirror underside outside the 48.6° critical cone)
  vec3 reflDir = reflect(rd, N);
  reflDir.y = -abs(reflDir.y);
  vec3 tirColor = computeWaterScatterColor(reflDir, camDepth01, refractedSunDir);

  // 3D wave relief & reflected caustic shimmer on the underside of the waves
  float distDetail = exp(-tHit * 0.025);
  // Sunlight entering here: a net of wave-focused light over the whole surface, brightest
  // where a shaft starts. Far away the net is finer than a pixel, so it fades to its mean.
  float netWide = lightNet(hitPos.xz * 0.8 + vec2(9.2, 1.4), t * 0.7);
  float netFine = lightNet(hitPos.xz * 2.3 + vec2(2.1, 5.3), t * 0.9) * distDetail;
  float lens = smoothstep(-0.9, 0.9, swellLens(hitPos.xz, t));
  float shaftHere = min(sunShaftPattern(sunEntryXZ(hitPos, refractedSunDir), t, 1.0), 2.6);
  float surfLight = mix(
    0.45,
    shaftHere * (0.6 + 0.9 * netWide) + (netWide * 0.75 + netFine * 0.4) * (0.35 + 0.65 * lens),
    distDetail
  );
  float waveShade = mix(1.0, 0.72 + 0.42 * clamp(crestFactor, 0.0, 1.2), distDetail);
  tirColor = tirColor * waveShade
           + mix(uScatterShallow, uSunScatter, 0.5) * surfLight * 0.16 * (1.0 - camDepth01 * 0.6);

  // Fade TIR relief seamlessly into baseWaterScatter at far grazing distances so horizon has zero seam
  tirColor = mix(baseWaterScatter, tirColor, distDetail);

  if (kR <= 0.0) {
    return tirColor;
  }

  // Inside Snell's window: refract into sky dome + sun disk
  vec3 refrDirG = normalize(etaG * rd + (etaG * cosI - sqrt(max(kG, 0.0001))) * N);
  refrDirG.y = max(refrDirG.y, 0.01);

  vec3 skyG = evaluateSkyAndSun(refrDirG, t);
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
    float rimGlow = smoothstep(0.16, 0.01, kG) * smoothstep(-0.01, 0.02, kR);
    transmittedSky += vec3(0.4, 0.82, 1.05) * rimGlow * 0.35;
  }

  // Refract emergent rocks/arch through Snell's window
  vec2 snellRefrUV = clamp(uv + waveNormal.xz * 0.04, 0.001, 0.999);
  float refrDepth = texture(depthBuffer, snellRefrUV).x;
  if (refrDepth < 0.999) {
    vec3 refrWorld = worldPosFromDepth(snellRefrUV, refrDepth);
    if (refrWorld.y > hitPos.y + 0.1) {
      vec3 aboveScene = texture(inputBuffer, snellRefrUV).rgb;
      transmittedSky = mix(transmittedSky, aboveScene, 0.85);
    }
  }

  // Exact dielectric Fresnel reflectance -> 1.0 at critical angle
  float cosT = sqrt(max(kG, 0.0));
  float rPerp = (etaG * cosI - cosT) / max(etaG * cosI + cosT, 0.001);
  float rPar = (cosI - etaG * cosT) / max(cosI + etaG * cosT, 0.001);
  float fresnel = clamp(0.5 * (rPerp * rPerp + rPar * rPar), 0.0, 1.0);

  // Bright patches where the waves focus the sun downward, strongest around the sun itself.
  // The light shafts hang from these patches.
  float towardSun = pow(max(0.0, dot(rd, refractedSunDir)), 3.0);
  transmittedSky = transmittedSky * (0.52 + 0.5 * surfLight)
                 + vec3(1.0, 0.97, 0.88) * surfLight * (0.18 + 0.5 * towardSun);

  // Overhead wave foam silhouettes visible inside Snell's window
  transmittedSky = mix(transmittedSky, vec3(0.82, 0.92, 0.98), foamCoverage * 0.5);

  return mix(transmittedSky, tirColor, fresnel);
}

// ─── Sea of Thieves / Assassin's Creed Top Ocean Surface Shading ─
// - Visibility into water depends on wave height, choppiness & depth (less glassy see-through)
// - Rich translucent jade-emerald subsurface scattering through wave crests
// - Realistic obstacle collision surf aprons, breaking wave rings & lacy cellular whitecaps

vec3 shadeTopWaterSurface(
  vec3 hitPos,
  float tHit,
  vec3 waveNormal,
  float crestFoam,
  float crestFactor,
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

  // Stronger wave refraction that scales with wave height and water depth
  float refrScale = clamp(origWaterDepth * 0.35, 0.0, 1.0) / max(tHit * 0.08 + 1.0, 1.0);
  vec2 refrOffset = N.xz * (0.045 + 0.025 * uWaveHeight) * refrScale;
  vec2 refrUV = clamp(uv + refrOffset, 0.001, 0.999);

  float refrDepth = texture(depthBuffer, refrUV).x;
  vec3 underPos = unrefractedWorldPos;
  vec2 sampleUV = uv;
  bool underIsSky = origIsSky;

  if (refrDepth < 0.9995) {
    vec3 candidatePos = worldPosFromDepth(refrUV, refrDepth);
    if (candidatePos.y < hitPos.y + 0.08) {
      underPos = candidatePos;
      sampleUV = refrUV;
      underIsSky = false;
    }
  }

  vec3 underScene = texture(inputBuffer, sampleUV).rgb;
  float verticalDepth = underIsSky ? 65.0 : max(0.0, hitPos.y - underPos.y);
  float uwPathLength = underIsSky ? 90.0 : length(underPos - hitPos);

  // 2. Underwater Caustics visible in shallow zones near obstacles & reefs
  if (!underIsSky && verticalDepth < 24.0) {
    vec3 caust = chromaticCaustics(underPos.xz, verticalDepth, refractedSunDir, t);
    float shallowCaustFade = exp(-verticalDepth * 0.14);
    underScene *= 1.0 + caust * shallowCaustFade * 1.25;
  }

  // 3. Wave-Dependent Opacity & Beer-Lambert Extinction (Sea of Thieves water body)
  // Larger and choppier waves churn the water column, reducing see-through depth so the ocean
  // surface feels substantial and liquid rather than overly transparent glass.
  float waveTurbidity = 1.25 + 0.65 * uWaveHeight + 0.35 * uWaveChoppiness + 1.2 * (1.0 - uWaterClarity);
  float opticalDist = (uwPathLength * 0.75 + verticalDepth * 1.15) * waveTurbidity;

  vec3 extCoeff = uAbsorption * 1.35 + vec3(uFogDensity * 3.2 + 0.055);
  vec3 transmittance = exp(-extCoeff * opticalDist);

  // Deep trough vs shallow shelf color grading
  float depthGrad = clamp(verticalDepth / (11.0 / max(waveTurbidity * 0.5, 0.5)), 0.0, 1.0);
  float troughDarken = clamp(0.68 + 0.32 * crestFactor, 0.55, 1.15);
  vec3 waterBodyColor = mix(uScatterShallow * 0.85, uScatterDeep * 0.92, pow(depthGrad, 0.62)) * troughDarken;

  vec3 refractedUnderwater = mix(waterBodyColor, underScene, transmittance);

  // 4. Sea of Thieves Signature Subsurface Wave-Crest Scattering (Jade / Emerald-Turquoise Glow)
  float sunBacklit = pow(max(0.0, dot(uSunDir, -V) * 0.65 + 0.45), 2.2);
  float grazingView = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 1.8);
  float thinCrest = pow(clamp(crestFactor, 0.0, 1.4), 1.5);
  vec3 sssTint = mix(uScatterShallow, uSunScatter, 0.62) * vec3(0.85, 1.18, 1.02);
  vec3 sssGlow = sssTint * thinCrest * (0.35 + 0.85 * sunBacklit) * (0.4 + 0.6 * grazingView);
  refractedUnderwater += sssGlow * 0.52;

  // 5. Schlick Fresnel Sky Reflection + Sun Specular Glints
  // Slightly higher base reflectivity on rough waves so the water surface reads clearly
  float cosTheta = clamp(dot(N, V), 0.0, 1.0);
  float F0 = 0.032;
  float fresnel = F0 + (0.96 - F0) * pow(1.0 - cosTheta, 4.2);

  vec3 reflDir = reflect(-V, N);
  reflDir.y = max(reflDir.y, 0.015);
  vec3 skyRefl = evaluateSkyAndSun(reflDir, t);

  vec3 H = normalize(uSunDir + V);
  float NdotH = max(0.0, dot(N, H));
  float specCore = pow(NdotH, 380.0) * 3.4;
  float specSparkle = pow(NdotH, 48.0) * 0.35;
  vec3 sunSpec = vec3(1.0, 0.95, 0.84) * (specCore + specSparkle);

  vec3 surfaceCol = mix(refractedUnderwater, skyRefl, fresnel) + sunSpec;

  // 6. Realistic Obstacle Collision Surf Apron, Breaking Rings & Lacy Foam
  float obstacleFoam = 0.0;
  if (!underIsSky && verticalDepth < 2.8) {
    // Wide turbulent surf apron where waves collide with rocks, arch legs & pillars
    float prox = 1.0 - smoothstep(0.0, 2.8, verticalDepth);
    float innerSplash = 1.0 - smoothstep(0.0, 0.65, verticalDepth);

    // Concentric breaking wave surges rushing against the obstacle
    float surgeWave1 = sin(verticalDepth * 6.5 - t * 3.8 + fbmSmooth(hitPos.xz * 0.9) * 3.0) * 0.5 + 0.5;
    float surgeWave2 = sin(verticalDepth * 13.0 + t * 2.9) * 0.5 + 0.5;
    float surge = pow(surgeWave1, 2.2) * 0.75 + surgeWave2 * 0.25;

    float rawObstacleEnergy = (prox * prox * (0.65 + 0.85 * surge) + innerSplash * 1.15)
                            * (0.75 + 0.45 * uWaveHeight);
    obstacleFoam = evaluateLacyFoam(hitPos.xz * 1.25, rawObstacleEnergy, tHit, t);
  }

  float totalFoam = clamp(crestFoam + obstacleFoam - crestFoam * obstacleFoam * 0.35, 0.0, 1.0);
  // Subtle subsurface cyan-white shading inside thick foam
  vec3 foamShadow = mix(uScatterShallow * 0.65 + vec3(0.45), vec3(0.96, 0.99, 1.0), 0.75);
  vec3 foamColor = foamShadow * (0.78 + 0.28 * max(0.2, uSunDir.y));
  surfaceCol = mix(surfaceCol, foamColor, totalFoam * 0.92);

  // Subtle atmospheric aerial perspective toward the distant horizon
  float horizonHaze = 1.0 - exp(-tHit * 0.0014);
  vec3 horizonSky = evaluateSkyAndSun(normalize(vec3(rd.x, max(rd.y, 0.02), rd.z)), t);
  return mix(surfaceCol, horizonSky, horizonHaze * 0.55);
}

// ─── Main Post-Processing Entry ─────────────────────────────────

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float t = uTime;
  float rawDepth = texture(depthBuffer, uv).x;
  bool isSky = rawDepth > 0.9995;

  vec3 worldPos = worldPosFromDepth(uv, rawDepth);
  vec3 toWorld = worldPos - cameraPos;
  // Normalize by the real length: a sky pixel reconstructs to the far plane, not to 1000 m,
  // and a short view vector inflates the Fresnel term into a pale mirror band.
  vec3 rd = normalize(toWorld);
  float sceneDist = isSky ? 1000.0 : length(toWorld);

  vec3 refractedSunDir = normalize(vec3(uSunDir.x * 0.75, max(uSunDir.y, 0.35), uSunDir.z * 0.75));

  // ── 1. Virtual Camera Lens Plane & 3D Wave Meniscus Classification ──
  float lensForwardDist = 0.35;
  float forwardCos = max(dot(rd, uCameraForward), 0.25);
  vec3 lensPos = cameraPos + rd * (lensForwardDist / forwardCos);

  float lensWaveH = uWaterLevel + waveHeightGeometric(lensPos.xz, t);
  float lensCapillary = (smoothNoise(vec2(uv.x * 8.0 + t * 0.6, t * 0.9)) - 0.5) * 0.005 * uWaveHeight;
  float signedLensHeight = lensPos.y - (lensWaveH + lensCapillary);

  float meniscusHalfBand = 0.015;
  bool pixelIsUnderwater = signedLensHeight < 0.0;

  vec2 workingUV = uv;
  float meniscusFactor = 1.0 - smoothstep(0.0, meniscusHalfBand, abs(signedLensHeight));
  if (meniscusFactor > 0.001) {
    float meniscusSlope = signedLensHeight / meniscusHalfBand;
    workingUV.y = clamp(uv.y + meniscusSlope * 0.016 * meniscusFactor, 0.001, 0.999);
  }

  // Analytical smooth lens wetness refraction (NO dFdx/dFdy 2x2 pixel blocks!)
  if (!pixelIsUnderwater && uWetness > 0.01) {
    vec2 dropP = uv * vec2(uAspect * 6.0, 6.0) + vec2(0.0, t * 0.4);
    float eps = 0.04;
    float dC = smoothNoise(dropP) * smoothNoise(dropP * 2.1 + 13.7);
    float dX = smoothNoise(dropP + vec2(eps, 0.0)) * smoothNoise((dropP + vec2(eps, 0.0)) * 2.1 + 13.7);
    float dY = smoothNoise(dropP + vec2(0.0, eps)) * smoothNoise((dropP + vec2(0.0, eps)) * 2.1 + 13.7);
    vec2 dropGrad = vec2(dX - dC, dY - dC) / eps;
    float dropMask = smoothstep(0.28, 0.62, dC) * uWetness;
    workingUV = clamp(workingUV + dropGrad * 0.006 * dropMask, 0.001, 0.999);
  }

  if (workingUV != uv) {
    rawDepth = texture(depthBuffer, workingUV).x;
    isSky = rawDepth > 0.9995;
    worldPos = worldPosFromDepth(workingUV, rawDepth);
    toWorld = worldPos - cameraPos;
    rd = normalize(toWorld);
    sceneDist = isSky ? 1000.0 : length(toWorld);
  }

  vec3 baseSceneColor = texture(inputBuffer, workingUV).rgb;

  float lensToCam = length(lensPos - cameraPos);
  float maxRayDistFromLens = max(0.0, sceneDist - lensToCam);

  // ── 2. Intersect View Ray with 3D Ocean Surface ──
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
      float vertWaterDepth = isSky ? 60.0 : max(0.0, (uWaterLevel - worldPos.y));
      float surfY;
      vec3 surfNormal;
      float crestFoam;
      float crestFactor;
      evaluateWaveSurface(
        surfHitPos.xz,
        tSurf,
        vertWaterDepth,
        t,
        surfY,
        surfNormal,
        crestFoam,
        crestFactor
      );

      finalColor = shadeTopWaterSurface(
        surfHitPos,
        tSurf,
        surfNormal,
        crestFoam,
        crestFactor,
        rd,
        workingUV,
        rawDepth,
        worldPos,
        refractedSunDir,
        t
      );
    } else if (!isSky) {
      // Dry above-water geometry with darkened wet-rock splash zone above waves
      float localWaveY = uWaterLevel + waveHeightGeometric(worldPos.xz, t);
      float heightAboveWave = worldPos.y - localWaveY;
      float splashZone = 1.2 + 0.6 * uWaveHeight;
      if (heightAboveWave > -0.15 && heightAboveWave < splashZone) {
        float wetMask = 1.0 - smoothstep(0.0, splashZone, max(0.0, heightAboveWave));
        finalColor *= mix(1.0, 0.52, wetMask * 0.8);
        // Subtle glistening wet specular on splashed rock
        finalColor += vec3(0.12, 0.16, 0.18) * pow(wetMask, 2.0);
      }
      float airFog = 1.0 - exp(-sceneDist * 0.0012);
      finalColor = mix(finalColor, evaluateSkyAndSun(rd, t), airFog * 0.45);
    } else {
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

    // Smooth underwater current refraction (depth-guarded)
    vec2 uwDistort = vec2(
      smoothNoise(workingUV * 6.5 + vec2(t * 0.35, -t * 0.22)) - 0.5,
      smoothNoise(workingUV * 6.5 + vec2(-t * 0.25, t * 0.38) + 31.4) - 0.5
    ) * 0.0024;
    vec2 uwUV = clamp(workingUV + uwDistort, 0.001, 0.999);
    // Take the shifted colour only where its whole bilinear footprint lies on the same surface.
    // Raw depth is too flat to tell kelp 30 m away from the sky behind it, and the raw render
    // has a bright sky there: one stray sample puts a pale rim on every thin silhouette.
    if (!isSky) {
      float zHere = linearViewDepth(rawDepth);
      vec2 h = texelSize * 0.75;
      float zMin = zHere;
      float zMax = zHere;
      for (int k = 0; k < 4; k++) {
        vec2 o = vec2(k == 0 || k == 3 ? -h.x : h.x, k < 2 ? -h.y : h.y);
        float z = linearViewDepth(texture(depthBuffer, uwUV + o).x);
        zMin = min(zMin, z);
        zMax = max(zMax, z);
      }
      if (zMax - zMin < 0.04 * zHere + 0.05) {
        baseSceneColor = texture(inputBuffer, uwUV).rgb;
      }
    }

    vec3 waterScatter = computeWaterScatterColor(rd, camDepth01, refractedSunDir);
    vec3 targetRadiance = waterScatter;
    float waterTravelDist = sceneDist;

    if (hitWaterSurface && tSurf < sceneDist) {
      float surfY;
      vec3 surfNormal;
      float crestFoam;
      float crestFactor;
      evaluateWaveSurface(
        surfHitPos.xz,
        tSurf,
        20.0,
        t,
        surfY,
        surfNormal,
        crestFoam,
        crestFactor
      );

      targetRadiance = shadeUndersideWaterSurface(
        surfHitPos,
        tSurf,
        surfNormal,
        crestFoam,
        crestFactor,
        rd,
        workingUV,
        camDepth01,
        refractedSunDir,
        waterScatter,
        t
      );
      waterTravelDist = tSurf;
    } else if (isSky) {
      // Open horizontal/downward water background -> converges 100% to waterScatter
      waterTravelDist = 220.0;
      targetRadiance = waterScatter;
    } else {
      // Underwater 3D Geometry (seabed, coral reef, stone arch, kelp, whale, manta rays)
      float geomDepthBelow = max(0.0, uWaterLevel - worldPos.y);

      // Smooth 3D caustics projected onto submerged surfaces without 2x2 dFdx facet artifacts
      vec3 caust = chromaticCaustics(worldPos.xz, geomDepthBelow, refractedSunDir, t);
      float distCaustFade = exp(-sceneDist * 0.028);
      // Caustics move sunlight around, they do not add any: dim between the filaments,
      // about twice as bright on them, a little more inside a light shaft. Never past
      // white, or kelp and fish in a shaft blow out and bloom.
      float shaft = min(sunShaftPattern(sunEntryXZ(worldPos, refractedSunDir), t, distCaustFade), 2.5);
      vec3 focus = 1.25 * (1.0 - exp(-caust * 0.55)) + shaft * 0.22 * smoothstep(0.05, 1.2, geomDepthBelow);
      vec3 sunGain = mix(vec3(1.0), vec3(0.76) + focus, distCaustFade);
      vec3 sunlitGeom = min(baseSceneColor * sunGain, max(baseSceneColor, vec3(0.9)));

      // Vertical depth Beer-Lambert ambient attenuation on the object itself
      vec3 verticalAtten = exp(-uAbsorption * (geomDepthBelow * 0.26));
      targetRadiance = sunlitGeom * mix(vec3(1.0), verticalAtten, 0.68);
    }

    // ── Energy-Conserving Beer-Lambert Absorption + In-Scattering ──
    finalColor = applyUnderwaterOptics(targetRadiance, waterScatter, waterTravelDist);

    // ── High-Contrast Volumetric God Rays (Light Shafts) ──
    vec3 godRayLight = computeVolumetricGodRays(
      cameraPos,
      rd,
      workingUV,
      waterTravelDist,
      refractedSunDir,
      t
    );
    finalColor += godRayLight * (1.0 - camDepth01 * 0.4);

    // Subtle underwater depth vignette
    vec2 centered = uv * 2.0 - 1.0;
    finalColor *= 1.0 - dot(centered, centered) * 0.08;
  }

  // ════════════════════════════════════════════════════════════════
  // MENISCUS WATERLINE RIBBON COMPOSITE
  // ════════════════════════════════════════════════════════════════
  if (meniscusFactor > 0.001) {
    float coreLine = exp(-pow(signedLensHeight / (meniscusHalfBand * 0.26), 2.0));
    float upperEdge = exp(-pow((signedLensHeight - meniscusHalfBand * 0.45) / (meniscusHalfBand * 0.22), 2.0));
    vec3 meniscusTint = mix(uScatterShallow, vec3(0.75, 0.96, 1.0), 0.55);

    finalColor = mix(finalColor, finalColor * meniscusTint * 1.12, meniscusFactor * 0.5);
    finalColor += vec3(0.85, 0.97, 1.0) * coreLine * 0.65;
    finalColor += vec3(1.0, 0.95, 0.85) * upperEdge * 0.3;
  }

  finalColor += (ign(gl_FragCoord.xy) - 0.5) / 255.0;

  outputColor = vec4(max(finalColor, vec3(0.0)), 1.0);
}
