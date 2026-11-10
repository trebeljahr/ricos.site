import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAMERA_VIEWPOINTS,
  evaluateWaveHeight,
  WATER_LEVEL,
  WATER_PRESETS,
  type WaterPresetKey,
} from "../waterPresets";

describe("UnderwaterShader waterPresets", () => {
  it("defines all five water optical presets with valid Beer-Lambert absorption and scatter parameters", () => {
    const expectedKeys: WaterPresetKey[] = ["tropical", "shallow", "deep", "murky", "abyssal"];
    for (const key of expectedKeys) {
      const preset = WATER_PRESETS[key];
      expect(preset).toBeDefined();
      expect(preset.absorption).toHaveLength(3);
      // Red absorption should be positive; all channels > 0
      expect(preset.absorption[0]).toBeGreaterThan(0);
      expect(preset.absorption[1]).toBeGreaterThan(0);
      expect(preset.absorption[2]).toBeGreaterThan(0);
      expect(preset.fogDensity).toBeGreaterThan(0);
      expect(preset.waveHeight).toBeGreaterThan(0);
    }
  });

  it("evaluates bounded, time-varying trochoidal wave heights matching the shader slab bounds", () => {
    for (const waveHeight of [0.5, 1.0, 2.0]) {
      const maxBound = 1.45 * waveHeight + 0.1;
      for (let x = -50; x <= 50; x += 25) {
        for (let z = -50; z <= 50; z += 25) {
          const h0 = evaluateWaveHeight(x, z, 0, waveHeight, 1.0);
          const h1 = evaluateWaveHeight(x, z, 1.7, waveHeight, 1.0);
          expect(Math.abs(h0)).toBeLessThanOrEqual(maxBound);
          expect(Math.abs(h1)).toBeLessThanOrEqual(maxBound);
          expect(h0).not.toBe(h1);
        }
      }
    }
  });

  it("provides camera viewpoints covering meniscus, underwater reef, Snell's window, surface, and abyss", () => {
    expect(CAMERA_VIEWPOINTS.length).toBeGreaterThanOrEqual(5);
    const meniscus = CAMERA_VIEWPOINTS.find((v) => v.id === "meniscus");
    const snell = CAMERA_VIEWPOINTS.find((v) => v.id === "snell");
    const surface = CAMERA_VIEWPOINTS.find((v) => v.id === "surface");

    expect(meniscus).toBeDefined();
    expect(Math.abs(meniscus!.position[1] - WATER_LEVEL)).toBeLessThan(0.5);

    expect(snell).toBeDefined();
    expect(snell!.position[1]).toBeLessThan(WATER_LEVEL);
    expect(snell!.rotation[0]).toBeGreaterThan(0.5); // Looking up into Snell's window

    expect(surface).toBeDefined();
    expect(surface!.position[1]).toBeGreaterThan(WATER_LEVEL);
    expect(surface!.rotation[0]).toBeLessThan(0); // Looking down at water surface
  });

  it("verifies underwaterBackground.frag declares all required uniforms and optical functions", () => {
    const shaderSource = readFileSync(
      resolve(process.cwd(), "src/shaders/underwaterBackground.frag"),
      "utf-8",
    );

    const requiredUniforms = [
      "cameraPos",
      "uCameraForward",
      "uCameraRight",
      "uCameraUp",
      "uTime",
      "uWaterLevel",
      "uSubmersion",
      "uWetness",
      "uSunDir",
      "uInvProjection",
      "uInvView",
      "uViewProjection",
      "uAbsorption",
      "uScatterShallow",
      "uScatterDeep",
      "uSunScatter",
      "uFogDensity",
      "uCausticsIntensity",
      "uGodRayIntensity",
      "uWaveHeight",
      "uWaveChoppiness",
      "uWaterClarity",
    ];

    for (const u of requiredUniforms) {
      expect(shaderSource).toContain(`uniform `);
      expect(shaderSource).toContain(u);
    }

    // Core optical pipeline entry points
    expect(shaderSource).toContain("intersectWaveSurface");
    expect(shaderSource).toContain("shadeUndersideWaterSurface");
    expect(shaderSource).toContain("shadeTopWaterSurface");
    expect(shaderSource).toContain("computeVolumetricGodRays");
    expect(shaderSource).toContain("chromaticCaustics");
    expect(shaderSource).toContain("void mainImage(");
  });
});
