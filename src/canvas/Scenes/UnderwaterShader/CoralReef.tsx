import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { createRng } from "../Particles/BoidSwarm/swarmConfig";
import { CORAL_PATCHES, type CoralColony, type CoralKind } from "./lagoonTerrain";

// Every builder returns one colony about a unit in size, standing on y = 0.
// The fish steer by the ellipsoids in `CORAL_SHAPE` (lagoonTerrain.ts), so
// keep the meshes inside them.

const UP = new Vector3(0, 1, 0);

/** Flat-shaded and ready to merge: no index, no uv. */
function faceted(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute("uv");
  flat.computeVertexNormals();
  return flat;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeBufferGeometries(parts.map(faceted)) as BufferGeometry;
  for (const part of parts) part.dispose();
  return merged;
}

/** Pushes every vertex in or out along its direction from the centre. */
function roughen(geometry: BufferGeometry, amount: number, frequency: number): BufferGeometry {
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const n =
      1 +
      amount *
        (Math.sin(x * frequency + y * 1.7) +
          Math.cos(z * frequency * 1.3 - x * 2.1) +
          Math.sin(y * frequency * 0.8 + z * 2.6)) *
        0.5;
    position.setXYZ(i, x * n, y * n, z * n);
  }
  return geometry;
}

/** A tapered stick from `from`, `length` long, pointing along `direction`. */
function stick(
  from: Vector3,
  direction: Vector3,
  length: number,
  radius: number,
  taper: number,
  sides: number,
  open = false,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius * taper, radius, length, sides, 1, open);
  geometry.translate(0, length / 2, 0);
  geometry.applyMatrix4(
    new Matrix4().compose(
      from,
      new Quaternion().setFromUnitVectors(UP, direction),
      new Vector3(1, 1, 1),
    ),
  );
  return geometry;
}

function rockGeometry(): BufferGeometry {
  const geometry = roughen(new IcosahedronGeometry(1, 1), 0.16, 2.3);
  geometry.scale(1.05, 0.72, 1.05);
  geometry.translate(0, 0.2, 0);
  return faceted(geometry);
}

function brainGeometry(): BufferGeometry {
  const geometry = roughen(new IcosahedronGeometry(1, 2), 0.07, 6.5);
  geometry.scale(0.95, 0.62, 0.95);
  geometry.translate(0, 0.25, 0);
  return faceted(geometry);
}

function staghornGeometry(): BufferGeometry {
  const rng = createRng(5);
  const parts: BufferGeometry[] = [];
  const grow = (
    from: Vector3,
    direction: Vector3,
    length: number,
    radius: number,
    depth: number,
  ) => {
    parts.push(stick(from, direction, length, radius, 0.62, 5));
    if (depth === 0) return;
    const tip = from.clone().addScaledVector(direction, length * 0.92);
    const forks = depth === 2 ? 3 : 2;
    for (let i = 0; i < forks; i++) {
      const spread = new Vector3(rng() - 0.5, 0.15 + rng() * 0.5, rng() - 0.5).normalize();
      const next = direction.clone().multiplyScalar(0.9).addScaledVector(spread, 0.8).normalize();
      grow(tip, next, length * (0.62 + rng() * 0.2), radius * 0.62, depth - 1);
    }
  };
  for (let trunk = 0; trunk < 4; trunk++) {
    const a = (trunk / 4) * Math.PI * 2 + rng();
    const lean = new Vector3(Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45).normalize();
    grow(new Vector3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), lean, 0.42, 0.085, 2);
  }
  return merge(parts);
}

function tubeGeometry(): BufferGeometry {
  const rng = createRng(9);
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.5;
    const d = i === 0 ? 0 : 0.14 + rng() * 0.2;
    const lean = new Vector3(Math.cos(a) * 0.22 * d * 3, 1, Math.sin(a) * 0.22 * d * 3).normalize();
    // Wider at the mouth, and open: a tube sponge.
    parts.push(
      stick(
        new Vector3(Math.cos(a) * d, 0, Math.sin(a) * d),
        lean,
        0.55 + rng() * 0.65,
        0.085 + rng() * 0.03,
        1.5,
        7,
        true,
      ),
    );
  }
  return merge(parts);
}

function fanGeometry(): BufferGeometry {
  const fan = new PlaneGeometry(1, 1, 10, 5);
  const position = fan.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) + 0.5;
    const v = position.getY(i) + 0.5;
    const angle = (u - 0.5) * 2.1;
    const r = 0.2 + v * (0.95 + 0.09 * Math.sin(u * 31));
    position.setXYZ(
      i,
      Math.sin(angle) * r * 0.62,
      Math.cos(angle) * r,
      0.08 * Math.sin(u * 6.3) * v,
    );
  }
  return merge([fan, stick(new Vector3(), UP, 0.28, 0.05, 0.7, 5)]);
}

function tableGeometry(): BufferGeometry {
  const cap = new CylinderGeometry(1, 0.72, 0.15, 11, 1);
  const position = cap.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const rim = 1 + 0.09 * Math.sin(Math.atan2(z, x) * 5);
    position.setXYZ(
      i,
      x * rim,
      position.getY(i) + 0.05 * Math.sin(x * 4) * Math.cos(z * 3),
      z * rim,
    );
  }
  cap.translate(0, 0.72, 0);
  return merge([cap, stick(new Vector3(), UP, 0.68, 0.24, 0.7, 6)]);
}

function anemoneGeometry(): BufferGeometry {
  const rng = createRng(13);
  const foot = new IcosahedronGeometry(0.42, 1);
  foot.scale(1, 0.5, 1);
  foot.translate(0, 0.12, 0);
  const parts: BufferGeometry[] = [foot];
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996;
    const d = Math.sqrt((i + 0.5) / 18) * 0.36;
    const lean = new Vector3(Math.cos(a) * d * 1.6, 1, Math.sin(a) * d * 1.6).normalize();
    parts.push(
      stick(
        new Vector3(Math.cos(a) * d, 0.2, Math.sin(a) * d),
        lean,
        0.28 + rng() * 0.16,
        0.045,
        0.45,
        4,
      ),
    );
  }
  return merge(parts);
}

const BUILDERS: Record<CoralKind, () => BufferGeometry> = {
  rock: rockGeometry,
  brain: brainGeometry,
  staghorn: staghornGeometry,
  tube: tubeGeometry,
  fan: fanGeometry,
  table: tableGeometry,
  anemone: anemoneGeometry,
};

function Colonies({
  kind,
  colonies,
  material,
}: {
  kind: CoralKind;
  colonies: readonly CoralColony[];
  material: MeshStandardMaterial;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => BUILDERS[kind](), [kind]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const dummy = new Object3D();
    const color = new Color();
    colonies.forEach((colony, i) => {
      dummy.position.fromArray(colony.pos);
      dummy.rotation.set(0, colony.yaw, 0);
      dummy.scale.setScalar(colony.scale);
      dummy.updateMatrix();
      target.setMatrixAt(i, dummy.matrix);
      target.setColorAt(i, color.set(colony.color));
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingSphere();
  }, [colonies]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, colonies.length]}
      castShadow
      receiveShadow
    />
  );
}

/** The coral reefs of the lagoon: rock heaps overgrown with coral colonies. */
export function CoralReef() {
  const byKind = useMemo(() => {
    const groups = new Map<CoralKind, CoralColony[]>();
    for (const patch of CORAL_PATCHES) {
      for (const colony of patch.colonies) {
        const list = groups.get(colony.kind);
        if (list) list.push(colony);
        else groups.set(colony.kind, [colony]);
      }
    }
    return [...groups];
  }, []);
  const material = useMemo(
    () => new MeshStandardMaterial({ roughness: 0.78, flatShading: true, side: DoubleSide }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      {byKind.map(([kind, colonies]) => (
        <Colonies key={kind} kind={kind} colonies={colonies} material={material} />
      ))}
    </group>
  );
}
