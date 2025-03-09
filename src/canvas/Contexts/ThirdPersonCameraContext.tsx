import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { usePointerContext } from "@r3f/Contexts/PointerContext";
import { useFrame } from "@react-three/fiber";
import { mat4, quat2, vec3 } from "gl-matrix";
import { createContext, PropsWithChildren, useContext, useRef } from "react";
import { usePlayerContext } from "./PlayerContext";
import { tileSize } from "@r3f/ChunkGenerationSystem/config";

const defaultThirdPersonCameraState = {
  gameUp: vec3.fromValues(0, 1, 0),
  position: vec3.create(),
  quaternion: quat2.create(),
  distance: 15,
  phi: Math.PI * 0.45,
  theta: -Math.PI * 0.25,
  aboveOffset: 2,
  phiLimits: { min: 0.1, max: Math.PI - 0.1 },
  active: false,
  activate: function () {
    this.active = true;
  },
  deactivate: function () {
    this.active = false;
  },
};

const ThirdPersonCameraContext = createContext(defaultThirdPersonCameraState);

export const useThirdPersonCameraContext = () => {
  return useContext(ThirdPersonCameraContext);
};

export const ThirdPersonCameraContextProvider = ({
  children,
}: PropsWithChildren) => {
  const value = useThirdPersonCameraState();

  return (
    <ThirdPersonCameraContext.Provider value={value}>
      {children}
    </ThirdPersonCameraContext.Provider>
  );
};

function normalizePointer(pointer: { x: number; y: number }) {
  const minSize = Math.min(window.innerWidth, window.innerHeight);
  return { x: pointer.x / minSize, y: pointer.y / minSize };
}

const useThirdPersonCameraState = () => {
  const thirdPersonCamera = useRef(defaultThirdPersonCameraState);

  const player = usePlayerContext();
  const pointer = usePointerContext();

  useFrame(() => {
    const cam = thirdPersonCamera.current;
    // if (pointer.down || viewport.pointerLock.active) {

    if (pointer.down) {
      const normalisedPointer = normalizePointer(pointer.delta);
      cam.phi -= normalisedPointer.y * 2;
      cam.theta -= normalisedPointer.x * 2;

      if (cam.phi < cam.phiLimits.min) cam.phi = cam.phiLimits.min;
      if (cam.phi > cam.phiLimits.max) cam.phi = cam.phiLimits.max;
    }

    // Position
    const sinPhiRadius = Math.sin(cam.phi) * cam.distance;
    const sphericalPosition = vec3.fromValues(
      sinPhiRadius * Math.sin(cam.theta),
      Math.cos(cam.phi) * cam.distance,
      sinPhiRadius * Math.cos(cam.theta)
    );
    vec3.add(cam.position, player.position.current, sphericalPosition);

    // Target
    const target = vec3.fromValues(
      player.position.current[0],
      player.position.current[1] + cam.aboveOffset,
      player.position.current[2]
    );

    // Quaternion
    const toTargetMatrix = mat4.create();
    mat4.targetTo(toTargetMatrix, cam.position, target, cam.gameUp);
    quat2.fromMat4(cam.quaternion, toTargetMatrix);

    // Clamp to ground
    const { height: elevation } = getHeight(cam.position[0], cam.position[2]);

    if (elevation && cam.position[1] < elevation + 1)
      cam.position[1] = elevation + 1;
  });

  return thirdPersonCamera.current;
};
