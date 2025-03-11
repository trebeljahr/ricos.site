import {
  debug,
  tilesDistance,
  tileSize,
} from "@r3f/ChunkGenerationSystem/config";
import { Sky, useHelper } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import { FaTemperatureFull } from "react-icons/fa6";
import {
  CameraHelper,
  DirectionalLight,
  FogExp2,
  Light,
  PCFSoftShadowMap,
  Vector3,
} from "three";
import { Sky as SkyImpl } from "three-stdlib";

export const OverheadLights = () => {
  const intensity = 10;
  const height = 10;

  return (
    <>
      <directionalLight
        intensity={intensity}
        position={[-tileSize, height, -tileSize]}
        color={"#808080"}
        target-position={[0, 0, 0]}
        castShadow={true}
      />
      {/* <directionalLight
        intensity={intensity}
        position={[tileSize, height, -tileSize]}
        color="#404040"
        target-position={[0, 0, 0]}
        castShadow={true}
      /> */}
    </>
  );
};

const sun = new Vector3();
const sunOffset = new Vector3();
const temp = new Vector3();
const offset = 3000;

export const AnimatedSkyBox = () => {
  const { sunValue } = useControls({
    sunValue: { value: 70, min: 0, max: 360, step: 1 },
  });

  const { gl, camera } = useThree();

  const fogRef = useRef<FogExp2>(null!);
  const dirLightRef = useRef<DirectionalLight>(null!);
  const skyRef = useRef<SkyImpl>(null!);

  useFrame(({ camera }) => {
    const dirLight = dirLightRef.current;
    camera.getWorldPosition(temp);
    // temp.copy(camera.position);

    // dirLight.position.copy(temp).setZ(temp.y + 40); // .add(offset);
    // dirLight.target.position.copy(temp).setZ(temp.y);
    // dirLight.shadow.camera.updateProjectionMatrix();

    // temp.add(new Vector3(0, 0, 0.1));
    dirLight.position.set(temp.x, dirLight.position.y, temp.z + offset);
    dirLight.target.position.set(temp.x, dirLight.target.position.y, temp.z);
    dirLight.updateMatrixWorld();
    dirLight.target.updateMatrixWorld();
  });

  useEffect(() => {
    // const sky = skyRef.current;
    // const fog = fogRef.current;
    const dirLight = dirLightRef.current;
    // const uniforms = sky.material.uniforms;

    sun.setFromSphericalCoords(
      1,
      Math.PI / -1.9 + sunValue * 0.02,
      Math.PI / 1.4
    );
    // uniforms["sunPosition"].value.copy(sun);

    const intensity = 3;
    dirLight.intensity =
      sun.y > 0.05 ? intensity : Math.max(0, (sun.y / 0.05) * intensity);
    sunOffset.copy(sun).multiplyScalar(100);

    // fog.color.setHSL(0, 0, sun.y);
    // dirLight.color.setHSL(0, 0, sun.y);

    // dirLight.position.copy(camera.position).setY(0).add(sunOffset);
    // dirLight.target.position.copy(camera.position).setY(0);
  }, [sunValue]);

  useEffect(() => {
    const dirLight = dirLightRef.current;
    dirLight.castShadow = true;
    const shadowSize = 2048;
    const shadowRange = 200;
    const heightSkyLight = 1000;

    dirLight.shadow.mapSize.set(shadowSize, shadowSize);
    dirLight.shadow.camera.left = -shadowRange;
    dirLight.shadow.camera.right = shadowRange;
    dirLight.shadow.camera.top = shadowRange;
    dirLight.shadow.camera.bottom = -shadowRange;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = Math.max(offset * 2, heightSkyLight * 2);
    dirLight.shadow.camera.updateProjectionMatrix();

    dirLight.position.set(temp.x, heightSkyLight, temp.z);
    dirLight.target.position.set(temp.x, 0, temp.z);

    // const sky = skyRef.current;

    // sky.scale.setScalar(450000);

    // const uniforms = sky.material.uniforms;
    // uniforms["turbidity"].value = 5;
    // uniforms["rayleigh"].value = 2;

    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
  }, []);

  // useHelper(dirLightRef.current?.shadow.camera, CameraHelper);
  useShadowHelper(dirLightRef);

  return (
    <>
      {/* <Sky ref={skyRef} /> */}
      <color attach="background" args={["#f9df8b"]} />
      <ambientLight intensity={0.2} />
      {/* <cameraHelper camera={dirLightRef.current.shadow.camera} /> */}
      <fogExp2 ref={fogRef} attach="fog" color="#f6e787" density={0.01} />

      <directionalLight ref={dirLightRef} color="#face3d" />
    </>
  );
};

export default function useShadowHelper(
  ref: React.MutableRefObject<Light | undefined>
) {
  const helper = useRef<CameraHelper>();
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!ref.current || !debug) return;

    helper.current = new CameraHelper(ref.current?.shadow.camera);
    if (helper.current) {
      scene.add(helper.current);
    }

    return () => {
      if (helper.current) {
        scene.remove(helper.current);
      }
    };
  }, [helper.current?.uuid, ref.current]);

  useFrame(() => {
    if (!helper.current?.update || !debug) return;

    helper.current.update();
  });
}
