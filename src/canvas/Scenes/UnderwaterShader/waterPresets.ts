export type WaterPresetKey = "tropical" | "shallow" | "deep" | "murky" | "abyssal";

export interface WaterPreset {
  label: string;
  /** Spectral Beer-Lambert absorption coefficients (R, G, B) in m^-1 */
  absorption: [number, number, number];
  /** In-scattering color near the surface */
  scatterShallow: string;
  /** In-scattering color at depth */
  scatterDeep: string;
  /** Forward Mie solar scatter tint */
  sunScatterColor: string;
  /** In-scattering fog density */
  fogDensity: number;
  /** Caustics brightness multiplier */
  causticsIntensity: number;
  /** Volumetric god-ray shaft multiplier */
  godRayIntensity: number;
  /** Wave amplitude multiplier */
  waveHeight: number;
  /** Wave choppiness / steepness */
  waveChoppiness: number;
  /** Water clarity (affects refraction distance & caustic sharpness) */
  waterClarity: number;
  /** Sun elevation in degrees */
  sunElevation: number;
  /** Sun azimuth in degrees */
  sunAzimuth: number;
  /** Post-processing bloom intensity */
  bloomIntensity: number;
}

export const WATER_PRESETS: Record<WaterPresetKey, WaterPreset> = {
  tropical: {
    label: "Tropical Lagoon",
    absorption: [0.24, 0.036, 0.022],
    scatterShallow: "#15b8c8",
    scatterDeep: "#032648",
    sunScatterColor: "#42ffd8",
    fogDensity: 0.018,
    causticsIntensity: 1.75,
    godRayIntensity: 1.95,
    waveHeight: 1.05,
    waveChoppiness: 1.1,
    waterClarity: 0.85,
    sunElevation: 46,
    sunAzimuth: 35,
    bloomIntensity: 0.72,
  },
  shallow: {
    label: "Shallow Reef",
    absorption: [0.28, 0.048, 0.032],
    scatterShallow: "#12a89d",
    scatterDeep: "#042c3d",
    sunScatterColor: "#5effcb",
    fogDensity: 0.024,
    causticsIntensity: 1.65,
    godRayIntensity: 2.1,
    waveHeight: 0.9,
    waveChoppiness: 1.0,
    waterClarity: 0.8,
    sunElevation: 40,
    sunAzimuth: 28,
    bloomIntensity: 0.78,
  },
  deep: {
    label: "Deep Pelagic",
    absorption: [0.38, 0.088, 0.024],
    scatterShallow: "#0a5c8f",
    scatterDeep: "#020d22",
    sunScatterColor: "#28a8ff",
    fogDensity: 0.028,
    causticsIntensity: 1.25,
    godRayIntensity: 2.0,
    waveHeight: 1.5,
    waveChoppiness: 1.35,
    waterClarity: 0.65,
    sunElevation: 36,
    sunAzimuth: 40,
    bloomIntensity: 0.75,
  },
  murky: {
    label: "Kelp Forest (Murky)",
    absorption: [0.35, 0.055, 0.14],
    scatterShallow: "#267450",
    scatterDeep: "#051c12",
    sunScatterColor: "#86eb62",
    fogDensity: 0.044,
    causticsIntensity: 1.1,
    godRayIntensity: 2.35,
    waveHeight: 1.15,
    waveChoppiness: 1.15,
    waterClarity: 0.45,
    sunElevation: 32,
    sunAzimuth: 25,
    bloomIntensity: 0.82,
  },
  abyssal: {
    label: "Abyssal Twilight",
    absorption: [0.46, 0.13, 0.046],
    scatterShallow: "#082d52",
    scatterDeep: "#010510",
    sunScatterColor: "#1b6ec2",
    fogDensity: 0.036,
    causticsIntensity: 0.9,
    godRayIntensity: 1.65,
    waveHeight: 1.3,
    waveChoppiness: 1.2,
    waterClarity: 0.6,
    sunElevation: 24,
    sunAzimuth: 45,
    bloomIntensity: 1.05,
  },
};

export interface CameraViewpoint {
  id: string;
  label: string;
  shortcut: string;
  position: [number, number, number];
  /** [pitch (x), yaw (y)] in radians */
  rotation: [number, number];
}

export const WATER_LEVEL = 45;

export const CAMERA_VIEWPOINTS: CameraViewpoint[] = [
  {
    id: "meniscus",
    label: "Waterline Meniscus",
    shortcut: "1",
    position: [0, WATER_LEVEL + 0.05, 22],
    rotation: [-0.04, 0.0],
  },
  {
    id: "reef",
    label: "Reef & God Rays",
    shortcut: "2",
    position: [-6, WATER_LEVEL - 9.5, 20],
    rotation: [0.12, -0.22],
  },
  {
    id: "snell",
    label: "Snell's Window",
    shortcut: "3",
    position: [2, WATER_LEVEL - 11.0, 6],
    rotation: [0.88, 0.15],
  },
  {
    id: "surface",
    label: "See-Through Surface",
    shortcut: "4",
    position: [12, WATER_LEVEL + 9.5, 26],
    rotation: [-0.42, 0.35],
  },
  {
    id: "abyss",
    label: "Abyssal Trench",
    shortcut: "5",
    position: [-24, WATER_LEVEL - 26.0, -18],
    rotation: [0.32, -0.55],
  },
];

/**
 * Exact CPU mirror of the shader's `waveHeightGeometric(vec2 p, float t)`
 * so camera waterline state, wave spray bursts, and UnderwaterContext match the GPU wave surface.
 */
export function evaluateWaveHeight(
  x: number,
  z: number,
  time: number,
  waveHeight = 1.0,
  choppiness = 1.0,
): number {
  let h = 0.0;
  const c = Math.min(0.58, Math.max(0.05, 0.32 * choppiness));

  // 1. Primary rolling ocean swells
  const p1 = (x * 0.86 + z * 0.51) * 0.085 + time * 0.92;
  h += Math.sin(p1 + c * Math.cos(p1)) * 0.52;

  const p2 = (-x * 0.58 + z * 0.81) * 0.095 - time * 0.78;
  h += Math.sin(p2 + c * Math.cos(p2)) * 0.38;

  // 2. Cross-swells
  const p3 = (x * 0.76 - z * 0.65) * 0.21 + time * 1.42;
  h += Math.sin(p3 + c * 0.85 * Math.cos(p3)) * 0.22;

  const p4 = (x * 0.42 + z * 0.91) * 0.26 - time * 1.25;
  h += Math.sin(p4 + c * 0.85 * Math.cos(p4)) * 0.16;

  // 3. Wind-driven chop
  const p5 = (x * 0.93 + z * 0.37) * 0.52 + time * 2.15;
  h += Math.sin(p5 + c * 0.6 * Math.cos(p5)) * 0.09;

  const p6 = (x * 0.64 - z * 0.77) * 0.68 - time * 1.95;
  h += Math.sin(p6 + c * 0.6 * Math.cos(p6)) * 0.065;

  return h * waveHeight;
}
