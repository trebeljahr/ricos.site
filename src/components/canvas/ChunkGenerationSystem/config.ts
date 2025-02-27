type Modes =
  | "height"
  | "biome"
  | "moisture"
  | "landscape"
  | "flat"
  | "temperature"
  | "normals"
  | "colors";

const debug = false;
const normalsDebug = false;
const visualizeHeight = true;
const tileSize = 30;
const tilesDistance = 20;
const mode: Modes = "landscape" as Modes;
const heightNoiseScale = 0.02;
const temperatureNoiseScale = 0.005;
const moistureNoiseScale = 0.004;
const wireframe = false;
const lodLevels = 10; // Number of LOD levels (from highest to lowest detail)
const baseResolution = 64; // Resolution of closest chunks (highest detail)
const lodDistanceFactor = 4; // How quickly LOD levels drop with distance
const HEIGHT_SCALE = 30;
const DETAIL_LEVELS = 3;
const PERSISTENCE = 0.5;

export {
  debug,
  normalsDebug,
  visualizeHeight,
  tileSize,
  tilesDistance,
  mode,
  heightNoiseScale,
  temperatureNoiseScale,
  moistureNoiseScale,
  wireframe,
  lodLevels,
  baseResolution,
  lodDistanceFactor,
  HEIGHT_SCALE,
  DETAIL_LEVELS,
  PERSISTENCE,
};
