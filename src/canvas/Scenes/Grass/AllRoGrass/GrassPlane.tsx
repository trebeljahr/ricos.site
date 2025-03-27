import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { createNoise2D } from "simplex-noise";
import {
  DoubleSide,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  Vector4,
} from "three";
import { GrassMaterial, GrassMaterialType } from "./AllRoGrassMaterial";
import { BlackPlaneMaterial } from "../GroundPlaneMaterials";

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

function getAttributeData(instances: number, width: number) {
  const offsets = [];
  const orientations = [];
  const stretches = [];
  const halfRootAngleSin = [];
  const halfRootAngleCos = [];

  let quaternion_0 = new Vector4();
  let quaternion_1 = new Vector4();

  const min = -0.25;
  const max = 0.25;

  for (let i = 0; i < instances; i++) {
    const offsetX = Math.random() * width - width / 2;
    const offsetZ = Math.random() * width - width / 2;
    // const offsetY = getYPosition(offsetX, offsetZ);
    offsets.push(offsetX, 0, offsetZ);

    let angle = Math.PI - Math.random() * (2 * Math.PI);
    halfRootAngleSin.push(Math.sin(0.5 * angle));
    halfRootAngleCos.push(Math.cos(0.5 * angle));

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

    orientations.push(
      quaternion_0.x,
      quaternion_0.y,
      quaternion_0.z,
      quaternion_0.w
    );

    if (i < instances / 3) {
      stretches.push(Math.random() * 1.8);
    } else {
      stretches.push(Math.random());
    }
  }

  return {
    offsets,
    orientations,
    stretches,
    halfRootAngleCos,
    halfRootAngleSin,
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
