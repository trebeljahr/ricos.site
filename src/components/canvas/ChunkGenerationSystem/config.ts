type Modes =
  | "height"
  | "biome"
  | "moisture"
  | "landscape"
  | "flat"
  | "temperature"
  | "normals"
  | "colors";

const debug = true;
const normalsDebug = false;
const visualizeHeight = false;
const tileSize = 50;
const tilesDistance = 5;
const mode: Modes = "landscape" as Modes;
const heightNoiseScale = 0.0007;
const temperatureNoiseScale = 0.00005;
const moistureNoiseScale = 0.00004;
const wireframe = false;
const lodLevels = 10;
const baseResolution = 32;
const lodDistanceFactor = 4;
const heightScale = 30;
const detailLevels = 3;
const persistence = 0.5;
const physicsDebug = false;

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
  heightScale,
  detailLevels,
  persistence,
  physicsDebug,
};
