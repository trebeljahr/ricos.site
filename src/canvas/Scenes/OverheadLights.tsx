import { tilesDistance, tileSize } from "@r3f/ChunkGenerationSystem/config";
import { Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { DirectionalLight, FogExp2, PCFSoftShadowMap, Vector3 } from "three";
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

export const AnimatedSkyBox = () => {
  const { gl } = useThree();

  const fogRef = useRef<FogExp2>(null!);
  const dirLightRef = useRef<DirectionalLight>(null!);
  const skyRef = useRef<SkyImpl>(null!);

  useFrame(({ clock, camera }) => {
    const millis = clock.getElapsedTime();

    const sky = skyRef.current;
    const fog = fogRef.current;
    const dirLight = dirLightRef.current;
    const uniforms = sky.material.uniforms;

    fog.color.setHSL(0, 0, sun.y);

    sun.setFromSphericalCoords(
      1,
      Math.PI / -1.9 + millis * 0.02,
      Math.PI / 1.4
    );
    uniforms["sunPosition"].value.copy(sun);

    const intensity = 2;
    dirLight.intensity =
      sun.y > 0.05 ? intensity : Math.max(0, (sun.y / 0.05) * intensity);
    sunOffset.copy(sun).multiplyScalar(1000);
    dirLight.position.copy(camera.position).add(sunOffset);
    dirLight.target.position.copy(camera.position).sub(sunOffset);
  });

  useEffect(() => {
    const dirLight = dirLightRef.current;
    dirLight.castShadow = true;
    const shadowSize = 2048;
    const shadowRange = 200;

    dirLight.shadow.mapSize.set(shadowSize, shadowSize);
    dirLight.shadow.camera.left = -shadowRange;
    dirLight.shadow.camera.right = shadowRange;
    dirLight.shadow.camera.top = shadowRange;
    dirLight.shadow.camera.bottom = -shadowRange;
    // dirLight.shadow.camera.near = 1000;
    dirLight.shadow.camera.far = 2000;
    dirLight.shadow.camera.updateProjectionMatrix();

    const sky = skyRef.current;
    sky.scale.setScalar(450000);

    const uniforms = sky.material.uniforms;
    uniforms["turbidity"].value = 5;
    uniforms["rayleigh"].value = 2;

    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
  }, []);

  return (
    <>
      <Sky ref={skyRef} />
      <ambientLight intensity={0.4} />

      <fogExp2 ref={fogRef} attach="fog" color="#ffffff" density={0.01} />

      <directionalLight ref={dirLightRef} />
    </>
  );
};
