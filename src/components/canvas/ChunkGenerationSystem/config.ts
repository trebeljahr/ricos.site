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
const tileSize = 50;
const tilesDistance = 2;
const mode: Modes = "landscape" as Modes;
const heightNoiseScale = 0.0007;
const temperatureNoiseScale = 0.00005;
const moistureNoiseScale = 0.00004;
const wireframe = true;
const lodLevels = 10;
const baseResolution = 32;
const lodDistanceFactor = 4;
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
