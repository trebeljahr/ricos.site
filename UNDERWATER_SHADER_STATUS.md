# Underwater Shader — Current Status & Handoff Document

## Overview

An underwater post-processing shader experiment at `/r3f/scenes/underwater-shader`. The goal is a reusable underwater effect inspired by Crest Ocean System / Abzu / Subnautica, supporting above-water, below-water, and surface transitions.

## Architecture

### Files

| File | Purpose |
|------|---------|
| `src/pages/r3f/scenes/underwater-shader.tsx` | Next.js page, auto-listed in nav |
| `src/canvas/Scenes/UnderwaterShader/UnderwaterShaderDemo.tsx` | Demo scene: geometry, lights, physics, water surface, EffectComposer |
| `src/canvas/Scenes/UnderwaterShader/UnderwaterEffect.tsx` | Custom `postprocessing` Effect class, manages uniforms |
| `src/canvas/Scenes/UnderwaterShader/WaterSurface.tsx` | Water surface mesh with vertex-displaced waves |
| `src/shaders/underwaterBackground.frag` | The post-processing fragment shader (all underwater effects) |

### How it works

1. **UnderwaterEffect.tsx** extends the `postprocessing` library's `Effect` class. It passes uniforms to the shader every frame:
   - `cameraPos`, `cameraLookAt` (direction vector)
   - `uTime`, `uWaterLevel` (45), `uSubmersion` (0-1 smooth transition)
   - `uCameraNear`, `uCameraFar`
   - `uSunDir` (normalized)
   - `uInvProjection` (camera.projectionMatrixInverse)
   - `uInvView` (camera.matrixWorld)

2. **The shader** uses `uInvProjection` and `uInvView` to reconstruct world positions from the depth buffer — the standard deferred rendering technique:
   ```glsl
   vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
   vec4 viewPos = uInvProjection * clip; viewPos /= viewPos.w;
   vec4 worldPos = uInvView * viewPos;
   ```

3. **WaterSurface.tsx** uses `CustomShaderMaterial` on `MeshStandardMaterial` with vertex displacement for 3D waves. `FrontSide` only (visible from above, the post-process handles the view from below).

4. **UnderwaterShaderDemo.tsx** has a local `PlayerController` (copy of SwimmingController but spawning at `waterHeight + 5`), scene objects, bubbles, sky, environment map, and the EffectComposer.

### Key constraints discovered

- **postprocessing library renames identifiers** with `e0` prefix — structs don't work (field access breaks). Use plain variables.
- **`mainImage` UV is [0,1]** — use directly for `texture(depthBuffer, uv)` and `texture(inputBuffer, uv)`. Convert to [-1,1] only for ray reconstruction.
- **`cameraLookAt`** is passed as a direction vector (not a position) — `getRayDir` must use `normalize(look)` not `normalize(look - pos)`.

## What works well

- **Per-channel Beer-Lambert absorption** — `vec3(0.9, 0.28, 0.35) * 0.22` density. Red absorbs fastest, matching real ocean optics.
- **Crest-style scatter color** — view-dependent with Henyey-Greenstein forward scattering toward the sun.
- **World-space caustics** — dual-layer sine wave interference with rotation, projected along light direction. Stable world coordinates via inverse matrix reconstruction.
- **Depth-derived surface normals** — `dFdx(worldPos)` / `dFdy(worldPos)` cross product for caustic vertical fade. Only upward-facing surfaces (`max(surfNormal.y, 0)`) get caustics.
- **Caustic-fog fade matching** — caustics use `exp(-dist * 0.06)` matched to the fog's green channel rate so they disappear together.
- **Water surface** — vertex-displaced waves, Fresnel alpha, forward scatter, FrontSide rendering.
- **Snell's window** — widened (crit 0.45, feather 0.30), with caustic wave pattern modulating the sky color from below. Detects water surface mesh via `isWaterSurface`.
- **Above-water** — objects below the water get Beer-Lambert tint + subtle caustics.
- **Transition** — `uSubmersion` global blend, smooth 6-unit band.
- **Edge-aware refraction** — depth-check prevents distortion sampling across object boundaries.
- **Dithering** — interleaved gradient noise eliminates banding.
- **Floor planes** — 1000x1000 units, beyond fog visibility range.
- **Underwater lighting** — ambient 0.3, directional 0.6 (reduced from above-water 0.8/2.0).
- **Dark background** — `#061a22` when underwater so Sky dome doesn't bleed through.

## What still needs fixing

### 1. God rays — the main unsolved problem

**Current state**: Ray marching from `cameraPos` straight up (`vec3(0,1,0)`). Every pixel starts from the same `cameraPos.xz` → all steps sample the same XZ → uniform brightness → no visible shafts. The `viewFade = smoothstep(-0.2, 0.6, rd.y)` creates a hard horizontal line.

**What was tried and why it failed**:

| Approach | Result | Why it failed |
|----------|--------|--------------|
| FBM noise based on `rd` | Soft blobs, invisible | View-space coordinates rotate with camera |
| FBM noise on world-space surface projection | Visible but rotated with camera | `rd` changes with camera rotation |
| Sine waves on world X | Barcode vertical stripes | Too periodic, no organic variation |
| Volumetric ray march from `cameraPos` up | Uniform brightness, no shafts | Every pixel marches same XZ column |
| Volumetric ray march from `cameraPos` along `rd` | Shafts on floor, not from surface | Light accumulated near floor geometry |
| Volumetric ray march from `cameraPos` along `uSunDir` | Uniform (same start for all pixels) | Same problem as straight up |
| Volumetric march from `worldPos` upward | Hard edge or invisible | Various accumulation math issues |
| Project view ray to surface, sample caustics | Barcode stripes (caustic pattern too fine) | Caustic function has high frequency |
| Project view ray to surface, use separate low-freq pattern | Visible but direction issues | Still coupled to view direction at boundaries |
| Use `worldPos.xz` directly | No shafts (uniform for floor pixels) | Floor is flat, all floor pixels have similar XZ |

**The fundamental challenge**: God rays need to be:
1. World-space stable (don't rotate with camera)
2. Different per-pixel (visible bright/dark variation)
3. From the surface downward (not from geometry upward)
4. Occluded by solid objects
5. Aligned with the Snell's window bright patches
6. No hard edges or branching artifacts

**Most promising untried approach**: March from each pixel's `worldPos` upward to the surface. The key insight missed in previous attempts: **`pos.xz` changes at each step because the march starts from `worldPos` (different per pixel), not `cameraPos` (same for all)**. The march direction is still `vec3(0,1,0)` but the XZ varies per pixel because the starting position varies. Previous attempt at this failed due to accumulation math producing invisible values — the multiplier was too low.

### 2. Minor issues

- Above-water caustics too strong when seen through transparent water surface (intensity needs capping)
- Sky pixels behind the water mesh get caustic treatment because `isSky` is false (water mesh writes depth)

## Technical reference

See `underwater-rendering-techniques.md` in the repo root for a comprehensive writeup of all the techniques with code examples and source links.

## Checkpoint

Main branch commit for known-good state (before god ray attempts went wrong): stored in memory as `c2063db2`. Revert command:
```
git checkout c2063db2 -- src/shaders/underwaterBackground.frag src/canvas/Scenes/UnderwaterShader/
```
