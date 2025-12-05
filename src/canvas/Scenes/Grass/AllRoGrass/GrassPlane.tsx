import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { createNoise2D } from "simplex-noise";
import {
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Triangle,
  Vector3,
  Vector4,
} from "three";
import { GrassMaterial, GrassMaterialType } from "./AllRoGrassMaterial";
import { BlackPlaneMaterial } from "../GroundPlaneMaterials";
import { MeshSurfaceSampler } from "three-stdlib";
import { playerQuery } from "@r3f/AI/ecs";

const noise2D = createNoise2D();

export const AllRoGrass = ({
  size = 1,
  width = 32,
  instances = 10000,
  ...props
}) => {
  const bH = 1;
  const bW = 0.12;
  const joints = 5;
  const materialRef = useRef<GrassMaterialType>(null!);
  const [texture, alphaMap] = useLoader(TextureLoader, [
    "/3d-assets/textures/grass/blade_diffuse.jpg",
    "/3d-assets/textures/grass/blade_alpha.jpg",
  ]);

  useFrame(({ clock }) => {
    materialRef.current.map = texture;
    materialRef.current.alphaMap = alphaMap;
    materialRef.current.toneMapped = false;
    materialRef.current.bladeHeight = bH;
    materialRef.current.bladeWidth = bW;
    materialRef.current.joints = joints;
    materialRef.current.time = clock.getElapsedTime() / 4;
  });

  const attributeData = useMemo(
    () => getAttributeData(instances, width),
    [instances, width]
  );

  const bladeGeom = useMemo(
    () => new PlaneGeometry(bW, bH, 1, joints).translate(0, bH / 2, 0),
    []
  );

  const planeGeo = useRef<PlaneGeometry>(null!);

  useEffect(() => {
    const geo = planeGeo.current;
    if (!geo) return;

    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      // const y = getYPosition(x, z);
      // positions.setXYZ(i, x, y, z);
    }

    geo.computeVertexNormals();
    positions.needsUpdate = true;
  }, []);

  return (
    <group {...props}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={BlackPlaneMaterial}>
        <planeGeometry
          args={[width, width, width - 1, width - 1]}
          ref={planeGeo}
        />
      </mesh>
      <mesh frustumCulled={false}>
        <instancedBufferGeometry
          index={bladeGeom.index}
          attributes-position={bladeGeom.attributes.position}
          attributes-uv={bladeGeom.attributes.uv}
        >
          <instancedBufferAttribute
            attach={"attributes-offset"}
            args={[new Float32Array(attributeData.offsets), 3]}
          />
          <instancedBufferAttribute
            attach={"attributes-orientation"}
            args={[new Float32Array(attributeData.orientations), 4]}
          />
          <instancedBufferAttribute
            attach={"attributes-stretch"}
            args={[new Float32Array(attributeData.stretches), 1]}
          />
          <instancedBufferAttribute
            attach={"attributes-halfRootAngleSin"}
            args={[new Float32Array(attributeData.halfRootAngleSin), 1]}
          />
          <instancedBufferAttribute
            attach={"attributes-halfRootAngleCos"}
            args={[new Float32Array(attributeData.halfRootAngleCos), 1]}
          />
        </instancedBufferGeometry>
        <grassMaterial
          ref={materialRef}
          side={DoubleSide}
          key={GrassMaterial.key}
        />
      </mesh>
    </group>
  );
};

export const CircleGrassPlane = ({}) => {
  const circle = useMemo(() => {
    const geometry = new CircleGeometry(20, 32);
    const material = new MeshBasicMaterial({
      color: "#0eba17",
      side: DoubleSide,
    });
    const circle = new Mesh(geometry, material);

    console.log("setting position");

    circle.position.y = 10;
    circle.rotation.x = Math.PI / 2;
    circle.updateMatrixWorld(true);

    return circle;
  }, []);

  return (
    <>
      <primitive object={circle} />

      <AllRoGrassForArbitrarySurface instances={10000} mesh={circle} />
    </>
  );
};

export const AllRoGrassForArbitrarySurface = ({
  instances = 10000,
  mesh,
  ...props
}: {
  instances: number;
  mesh: Mesh;
}) => {
  const bH = 1;
  const bW = 0.12;
  const joints = 5;
  const materialRef = useRef<GrassMaterialType>(null!);
  const [texture, alphaMap] = useLoader(TextureLoader, [
    "/3d-assets/textures/grass/blade_diffuse.jpg",
    "/3d-assets/textures/grass/blade_alpha.jpg",
  ]);

  useFrame(({ clock }) => {
    materialRef.current.map = texture;
    materialRef.current.alphaMap = alphaMap;
    materialRef.current.toneMapped = false;
    materialRef.current.bladeHeight = bH;
    materialRef.current.bladeWidth = bW;
    materialRef.current.joints = joints;
    materialRef.current.time = clock.getElapsedTime() / 4;
  });

  const attributeData = useMemo(
    () => makeAlroGrassForSurface(instances, mesh),
    [instances, mesh]
  );

  const bladeGeom = useMemo(
    () => new PlaneGeometry(bW, bH, 1, joints).translate(0, bH / 2, 0),
    []
  );

  return (
    <group {...props}>
      <mesh frustumCulled={false}>
        <instancedBufferGeometry
          index={bladeGeom.index}
          attributes-position={bladeGeom.attributes.position}
          attributes-uv={bladeGeom.attributes.uv}
        >
          <instancedBufferAttribute
            attach={"attributes-offset"}
            args={[new Float32Array(attributeData.offsets), 3]}
          />
          <instancedBufferAttribute
            attach={"attributes-orientation"}
            args={[new Float32Array(attributeData.orientations), 4]}
          />
          <instancedBufferAttribute
            attach={"attributes-stretch"}
            args={[new Float32Array(attributeData.stretches), 1]}
          />
          <instancedBufferAttribute
            attach={"attributes-halfRootAngleSin"}
            args={[new Float32Array(attributeData.halfRootAngleSin), 1]}
          />
          <instancedBufferAttribute
            attach={"attributes-halfRootAngleCos"}
            args={[new Float32Array(attributeData.halfRootAngleCos), 1]}
          />
        </instancedBufferGeometry>
        <grassMaterial
          ref={materialRef}
          side={DoubleSide}
          key={GrassMaterial.key}
        />
      </mesh>
    </group>
  );
};

function makeAlroGrassForSurface(instances: number, surface: Mesh) {
  console.log("surface from within", surface);
  console.log("position", surface.position);
  surface.updateMatrixWorld(true);

  const sampler = new MeshSurfaceSampler(surface).build();
  const orientations = [];
  const offsets = [];
  const stretches = [];
  const halfRootAngleSin = [];
  const halfRootAngleCos = [];

  for (let i = 0; i < instances; i++) {
    const _position = new Vector3();
    const _normal = new Vector3();

    sampler.sample(_position, _normal);
    const stretch = i < instances / 3 ? Math.random() * 1.8 : Math.random();

    const { quaternion_0, randomAngleSin, randomAngleCos } =
      constructRandomGlassBladeData();

    halfRootAngleSin.push(randomAngleSin);
    halfRootAngleCos.push(randomAngleCos);
    orientations.push(
      quaternion_0.x,
      quaternion_0.y,
      quaternion_0.z,
      quaternion_0.w
    );

    _position.applyMatrix4(surface.matrixWorld);

    offsets.push(_position.x, _position.y, _position.z);
    stretches.push(stretch);
  }

  return {
    offsets,
    stretches,
    orientations,
    halfRootAngleCos,
    halfRootAngleSin,
  };
}

function getAttributeData(instances: number, width: number) {
  const offsets = [];
  const orientations = [];
  const stretches = [];
  const halfRootAngleSin = [];
  const halfRootAngleCos = [];

  for (let i = 0; i < instances; i++) {
    const offsetX = Math.random() * width - width / 2;
    const offsetZ = Math.random() * width - width / 2;
    // const offsetY = getYPosition(offsetX, offsetZ);
    offsets.push(offsetX, 0, offsetZ);
    const stretch = i < instances / 3 ? Math.random() * 1.8 : Math.random();

    const { quaternion_0, randomAngleSin, randomAngleCos } =
      constructRandomGlassBladeData();

    orientations.push(
      quaternion_0.x,
      quaternion_0.y,
      quaternion_0.z,
      quaternion_0.w
    );
    halfRootAngleSin.push(randomAngleSin);
    halfRootAngleCos.push(randomAngleCos);
    stretches.push(stretch);
  }

  return {
    offsets,
    orientations,
    stretches,
    halfRootAngleCos,
    halfRootAngleSin,
  };
}

let quaternion_0 = new Vector4();
let quaternion_1 = new Vector4();

const min = -0.25;
const max = 0.25;

function constructRandomGlassBladeData() {
  let angle = Math.PI - Math.random() * (2 * Math.PI);

  const randomAngleSin = Math.sin(0.5 * angle);
  const randomAngleCos = Math.cos(0.5 * angle);

  let RotationAxis = new Vector3(0, 1, 0);
  let x = RotationAxis.x * Math.sin(angle / 2.0);
  let y = RotationAxis.y * Math.sin(angle / 2.0);
  let z = RotationAxis.z * Math.sin(angle / 2.0);
  let w = Math.cos(angle / 2.0);
  quaternion_0.set(x, y, z, w).normalize();

  angle = Math.random() * (max - min) + min;
  RotationAxis = new Vector3(1, 0, 0);
  x = RotationAxis.x * Math.sin(angle / 2.0);
  y = RotationAxis.y * Math.sin(angle / 2.0);
  z = RotationAxis.z * Math.sin(angle / 2.0);
  w = Math.cos(angle / 2.0);
  quaternion_1.set(x, y, z, w).normalize();

  quaternion_0 = multiplyQuaternions(quaternion_0, quaternion_1);

  angle = Math.random() * (max - min) + min;
  RotationAxis = new Vector3(0, 0, 1);
  x = RotationAxis.x * Math.sin(angle / 2.0);
  y = RotationAxis.y * Math.sin(angle / 2.0);
  z = RotationAxis.z * Math.sin(angle / 2.0);
  w = Math.cos(angle / 2.0);
  quaternion_1.set(x, y, z, w).normalize();

  quaternion_0 = multiplyQuaternions(quaternion_0, quaternion_1);

  return {
    quaternion_0,
    randomAngleSin,
    randomAngleCos,
  };
}

function multiplyQuaternions(q1: Vector4, q2: Vector4) {
  const x = q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x;
  const y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y;
  const z = q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z;
  const w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w;
  return new Vector4(x, y, z, w);
}

function getYPosition(x: number, z: number) {
  var y = 2 * noise2D(x / 50, z / 50);
  y += 4 * noise2D(x / 100, z / 100);
  y += 0.2 * noise2D(x / 10, z / 10);
  return y;
}

const createConveyorBeltMesh = (points: Vector3[], beltWidth = 1.0) => {
  const curve = new CatmullRomCurve3(points);
  const segments = points.length * 3;
  const pathPoints = curve.getPoints(segments);

  const vertices = [];
  const indices = [];
  const uvs = [];

  for (let i = 0; i < pathPoints.length; i++) {
    const point = pathPoints[i];
    const t = i / (pathPoints.length - 1);

    const tangent = curve.getTangent(t);

    const worldUp = new Vector3(0, 1, 0);

    const binormal = new Vector3().crossVectors(worldUp, tangent).normalize();

    if (binormal.length() < 0.01) {
      binormal.set(1, 0, 0);
    }

    const halfWidth = beltWidth / 2;
    const left = point.clone().add(binormal.clone().multiplyScalar(halfWidth));
    const right = point
      .clone()
      .add(binormal.clone().multiplyScalar(-halfWidth));

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    uvs.push(0, t);
    uvs.push(1, t);

    if (i < pathPoints.length - 1) {
      const base = i * 2;

      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return new Mesh(geometry);
};

export const PlayerWithGrassTrail = () => {
  const trailMeshRef = useRef<Mesh>(null!);
  const [grassKey, setGrassKey] = useState(0);

  const trailPointsRef = useRef<Vector3[]>([]);

  const frameCount = useRef(0);

  useFrame(() => {
    const player = playerQuery.first;
    if (!player) return;

    const { x, y, z } = player.rigidBody.translation();
    if (frameCount.current++ % 5 === 0) {
      trailPointsRef.current.push(new Vector3(x, y, z));

      if (trailPointsRef.current.length > 100) {
        trailPointsRef.current.shift();
      }

      if (trailPointsRef.current.length > 2) {
        updateTrailMesh();
        // setGrassKey((prev) => prev + 1);
      }
    }
  });

  const updateTrailMesh = () => {
    const points = trailPointsRef.current;

    const tubeGeometry = createConveyorBeltMesh(points, 2.0);

    if (trailMeshRef.current) {
      trailMeshRef.current.geometry.dispose();
      trailMeshRef.current.geometry = tubeGeometry.geometry;
      trailMeshRef.current.updateMatrixWorld(true);
    }
  };

  return (
    <>
      <mesh ref={trailMeshRef}>
        <tubeGeometry />
        <meshBasicMaterial visible={false} />
      </mesh>

      {trailMeshRef.current && (
        <AllRoGrassForArbitrarySurface
          key={grassKey}
          instances={5000}
          mesh={trailMeshRef.current}
        />
      )}
    </>
  );
};
