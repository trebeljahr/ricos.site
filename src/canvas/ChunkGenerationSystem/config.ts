type Modes =
  | "height"
  | "biome"
  | "moisture"
  | "landscape"
  | "flat"
  | "temperature"
  | "normals"
  | "colors"
  | "none";

const debug = false;
const physicsDebug = false;
const normalsDebug = false;
const wireframe = true;
const flatShading = false;
const onlyRenderOnce = false;
const debugCamera = false;
const recording = false;
const perf = !recording && true;
const nav = !recording && true;
const visualizeHeight = true;

const tileSize = 100;
const tilesDistance = 4;
const mode: Modes = "landscape" as Modes;
const heightNoiseScale = 0.007;
const temperatureNoiseScale = 0.0005;
const moistureNoiseScale = 0.0004;
const maxLodLevel = 6;
const baseResolution = 16;
const lodDistanceFactor = 1.2;
const heightScale = 20;
const detailLevels = 3;
const persistence = 0.5;
const treeMinDistance = 6;
const treeMaxDistance = treeMinDistance * 3;
const withAutoComputedNormals = false;

const firstLodLevelDistance = 2;
const secondLodLevelDistance = 3;
const thirdLodLevelDistance = 4;

export {
  debug,
  normalsDebug,
  visualizeHeight,
  withAutoComputedNormals,
  tileSize,
  tilesDistance,
  mode,
  onlyRenderOnce,
  perf,
  nav,
  recording,
  treeMaxDistance,
  treeMinDistance,
  heightNoiseScale,
  temperatureNoiseScale,
  moistureNoiseScale,
  wireframe,
  maxLodLevel,
  flatShading,
  baseResolution,
  lodDistanceFactor,
  heightScale,
  detailLevels,
  persistence,
  physicsDebug,
  firstLodLevelDistance,
  secondLodLevelDistance,
  thirdLodLevelDistance,
  debugCamera,
};
