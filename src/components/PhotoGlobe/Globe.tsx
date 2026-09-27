import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, DoubleSide } from "three";
import worldLand from "../../content/world-land.json";
import {
  ATMOSPHERE_RADIUS,
  COAST_RADIUS,
  GRATICULE_RADIUS,
  LAND_RADIUS,
  OCEAN_RADIUS,
} from "./geo";
import { buildGraticule, buildLandGeometry, type LandRing } from "./landGeometry";
import type { GlobePalette } from "./palette";

/**
 * The land outlines are imported straight into the bundle rather than passed as a prop:
 * they are the same 84 KB for every page, and `PhotoGlobe` is meant to be mounted through
 * `next/dynamic`, so the JSON rides along in the lazy chunk instead of the eager one.
 */
const RINGS = worldLand.rings as LandRing[];

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vViewNormal;
  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vViewNormal;
  void main() {
    float rim = pow(1.0 - abs(vViewNormal.z), 3.0);
    gl_FragColor = vec4(uColor, rim * uStrength);
  }
`;

export type GlobeProps = {
  palette: GlobePalette;
};

/**
 * The planet itself: an opaque ocean sphere, filled land, a coastline and a faint
 * graticule, plus a rim glow that keeps the silhouette readable against the page.
 *
 * Every buffer is built once on mount. Nothing in here allocates per frame.
 */
export function Globe({ palette }: GlobeProps) {
  const land = useMemo(
    () => buildLandGeometry(RINGS, { fillRadius: LAND_RADIUS, coastRadius: COAST_RADIUS }),
    [],
  );
  const graticule = useMemo(() => buildGraticule(GRATICULE_RADIUS), []);

  // Created once and then written in place, so a theme swap recolours the rim glow
  // without three.js recompiling the shader program.
  const uniforms = useRef<{ uColor: { value: Color }; uStrength: { value: number } } | null>(null);
  if (uniforms.current === null) {
    uniforms.current = { uColor: { value: new Color() }, uStrength: { value: 0.55 } };
  }
  const atmosphereUniforms = uniforms.current;

  useEffect(() => {
    atmosphereUniforms.uColor.value.set(palette.atmosphere);
  }, [atmosphereUniforms, palette.atmosphere]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[OCEAN_RADIUS, 64, 48]} />
        <meshBasicMaterial color={palette.ocean} />
      </mesh>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[graticule, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.graticule} transparent opacity={0.65} />
      </lineSegments>

      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[land.fillPositions, 3]} />
        </bufferGeometry>
        {/* Unlit on purpose: a lit globe hides half the data in its own night side. */}
        <meshBasicMaterial color={palette.land} side={DoubleSide} />
      </mesh>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[land.coastPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.coast} transparent opacity={0.85} />
      </lineSegments>

      <mesh scale={ATMOSPHERE_RADIUS}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_FRAGMENT}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
