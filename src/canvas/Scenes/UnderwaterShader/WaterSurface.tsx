import { evaluateWaveHeight, WATER_LEVEL } from "./waterPresets";

/**
 * The ocean surface is ray-traced analytically in `underwaterBackground.frag`
 * against the 3D Gerstner/trochoidal wave heightfield so that:
 * 1. Underwater geometry remains in the depth buffer for true screen-space refraction,
 *    Beer-Lambert absorption, and caustics when viewed from above the surface.
 * 2. Both the top surface and underside (Snell's window + Total Internal Reflection)
 *    connect with zero near-plane gap to the camera lens meniscus waterline.
 *
 * This module re-exports the shared wave height evaluator for any CPU consumers.
 */
export { evaluateWaveHeight, WATER_LEVEL };

export function WaterSurface(_props: { position?: [number, number, number]; size?: number }) {
  return null;
}
