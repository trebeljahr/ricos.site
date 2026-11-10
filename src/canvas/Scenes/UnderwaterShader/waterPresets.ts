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
    absorption: [0.22, 0.032, 0.018],
    scatterShallow: "#18c4d4",
    scatterDeep: "#042c54",
    sunScatterColor: "#4affdc",
    fogDensity: 0.015,
    causticsIntensity: 1.65,
    godRayIntensity: 1.4,
    waveHeight: 0.9,
    waveChoppiness: 1.0,
    waterClarity: 1.0,
    sunElevation: 48,
    sunAzimuth: 35,
    bloomIntensity: 0.85,
  },
  shallow: {
    label: "Shallow Reef",
    absorption: [0.26, 0.044, 0.03],
    scatterShallow: "#14b5a6",
    scatterDeep: "#053447",
    sunScatterColor: "#66ffd2",
    fogDensity: 0.021,
    causticsIntensity: 1.55,
    godRayIntensity: 1.55,
    waveHeight: 0.8,
    waveChoppiness: 0.9,
    waterClarity: 0.9,
    sunElevation: 42,
    sunAzimuth: 28,
    bloomIntensity: 0.95,
  },
  deep: {
    label: "Deep Pelagic",
    absorption: [0.36, 0.082, 0.02],
    scatterShallow: "#0b649c",
    scatterDeep: "#020e26",
    sunScatterColor: "#2eb0ff",
    fogDensity: 0.026,
    causticsIntensity: 1.15,
    godRayIntensity: 1.5,
    waveHeight: 1.35,
    waveChoppiness: 1.25,
    waterClarity: 0.85,
    sunElevation: 38,
    sunAzimuth: 40,
    bloomIntensity: 0.9,
  },
  murky: {
    label: "Kelp Forest (Murky)",
    absorption: [0.34, 0.052, 0.135],
    scatterShallow: "#2b8058",
    scatterDeep: "#062116",
    sunScatterColor: "#8ef068",
    fogDensity: 0.042,
    causticsIntensity: 1.0,
    godRayIntensity: 1.85,
    waveHeight: 1.05,
    waveChoppiness: 1.05,
    waterClarity: 0.55,
    sunElevation: 34,
    sunAzimuth: 25,
    bloomIntensity: 1.0,
  },
  abyssal: {
    label: "Abyssal Twilight",
    absorption: [0.44, 0.125, 0.042],
    scatterShallow: "#09325c",
    scatterDeep: "#010614",
    sunScatterColor: "#1d75cc",
    fogDensity: 0.034,
    causticsIntensity: 0.8,
    godRayIntensity: 1.2,
    waveHeight: 1.15,
    waveChoppiness: 1.1,
    waterClarity: 0.75,
    sunElevation: 24,
    sunAzimuth: 45,
    bloomIntensity: 1.25,
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
 * Exact CPU mirror of the shader's `waveHeightGeometric(vec2 p, float time, float amp, float chop)`
 * so camera waterline state, floating objects, and UnderwaterContext match the GPU wave surface.
 */
export function evaluateWaveHeight(
  x: number,
  z: number,
  time: number,
  waveHeight = 1.0,
  choppiness = 1.0,
): number {
  let h = 0.0;
  const c = 0.28 * choppiness;

  // Swell 1
  const p1 = x * 0.075 + z * 0.045 + time * 0.85;
  h += Math.sin(p1 + c * Math.cos(p1)) * 0.48;

  // Swell 2
  const p2 = -x * 0.055 + z * 0.082 - time * 0.72;
  h += Math.sin(p2 + c * Math.cos(p2)) * 0.36;

  // Cross wave 3
  const p3 = x * 0.19 + z * 0.14 + time * 1.35;
  h += Math.sin(p3 + c * 0.8 * Math.cos(p3)) * 0.2;

  // Cross wave 4
  const p4 = x * 0.15 - z * 0.23 - time * 1.15;
  h += Math.sin(p4 + c * 0.8 * Math.cos(p4)) * 0.15;

  // Medium chop 5
  const p5 = (x + z) * 0.42 + time * 2.05;
  h += Math.sin(p5) * 0.08;

  // Medium chop 6
  const p6 = (x - z * 1.2) * 0.55 - time * 1.85;
  h += Math.sin(p6) * 0.06;

  return h * waveHeight;
}
