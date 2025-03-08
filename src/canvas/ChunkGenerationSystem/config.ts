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
const physicsDebug = false;
const wireframe = false;
const flatShading = false;
const onlyRenderOnce = false;
const debugCamera = false;
const perf = false;
const visualizeHeight = true;

const tileSize = 100;
const tilesDistance = 6;
const mode: Modes = "landscape" as Modes;
const heightNoiseScale = 0.007;
const temperatureNoiseScale = 0.0005;
const moistureNoiseScale = 0.0004;
const lodLevels = 10;
const baseResolution = 64;
const lodDistanceFactor = 4;
const heightScale = 20;
const detailLevels = 3;
const persistence = 0.5;
const treeMinDistance = 5;
const treeMaxDistance = 20;

export {
  debug,
  normalsDebug,
  visualizeHeight,
  tileSize,
  tilesDistance,
  mode,
  onlyRenderOnce,
  perf,
  treeMaxDistance,
  treeMinDistance,
  heightNoiseScale,
  temperatureNoiseScale,
  moistureNoiseScale,
  wireframe,
  lodLevels,
  flatShading,
  baseResolution,
  lodDistanceFactor,
  heightScale,
  detailLevels,
  persistence,
  physicsDebug,
  debugCamera,
};
