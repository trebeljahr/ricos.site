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

const temp = new Vector3();
const offset = 3000;

export const AnimatedSkyBox = () => {
  const { gl } = useThree();

  const fogRef = useRef<FogExp2>(null!);
  const dirLightRef = useRef<DirectionalLight>(null!);

  useFrame(({ camera }) => {
    const dirLight = dirLightRef.current;
    camera.getWorldPosition(temp);

    dirLight.position.set(temp.x, dirLight.position.y, temp.z + offset);
    dirLight.target.position.set(temp.x, dirLight.target.position.y, temp.z);
    dirLight.updateMatrixWorld();
    dirLight.target.updateMatrixWorld();
  });

  useEffect(() => {
    const dirLight = dirLightRef.current;
    dirLight.castShadow = true;
    const shadowSize = 2048;
    const shadowRange = 200;
    const heightSkyLight = 1000;

    dirLight.intensity = 5;
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

    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
  }, []);

  useShadowHelper(dirLightRef);

  return (
    <>
      {/* <Sky /> */}
      <color attach="background" args={["#76c1ff"]} />
      <ambientLight intensity={0.2} />
      <fogExp2 ref={fogRef} attach="fog" color="#fbf2b9" density={0.01} />

      <directionalLight ref={dirLightRef} color="#fff0bd" />
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
