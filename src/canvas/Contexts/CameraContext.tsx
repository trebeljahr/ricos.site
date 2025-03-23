import { useFrame } from "@react-three/fiber";
import { quat2, vec3 } from "gl-matrix";
import { createContext, PropsWithChildren, useContext, useRef } from "react";
import { useThirdPersonCameraContext } from "./ThirdPersonCameraContext";
import { useFlyCameraContext } from "./FlyCameraContext";

export enum CameraModes {
  ThirdPerson,
  Fly,
}

const defaultCameraState = {
  position: vec3.create(),
  quaternion: quat2.create(),
  mode: CameraModes.ThirdPerson,
};

const CameraContext = createContext(defaultCameraState);

export const useCameraContext = () => {
  return useContext(CameraContext);
};

export const CameraContextProvider = ({ children }: PropsWithChildren) => {
  const value = useCameraState();

  return (
    <CameraContext.Provider value={value}>{children}</CameraContext.Provider>
  );
};

export const useCameraState = () => {
  const camera = useRef(defaultCameraState);

  const flyCamera = useFlyCameraContext();
  const thirdPersonCamera = useThirdPersonCameraContext();

  const toggleCameraMode = (newMode: CameraModes) => {
    if (newMode === CameraModes.ThirdPerson) {
      camera.current.mode = CameraModes.Fly;
      thirdPersonCamera.activate();
      flyCamera.deactivate();
    } else if (newMode === CameraModes.Fly) {
      camera.current.mode = CameraModes.Fly;
      flyCamera.activate(camera.current.position, camera.current.quaternion);
      thirdPersonCamera.deactivate();
    }
  };

  useFrame(({ camera: sceneCamera }) => {
    if (camera.current.mode === CameraModes.ThirdPerson) {
      vec3.copy(camera.current.position, thirdPersonCamera.position);
      quat2.copy(camera.current.quaternion, thirdPersonCamera.quaternion);
    } else if (camera.current.mode === CameraModes.Fly) {
      vec3.copy(camera.current.position, flyCamera.position);
      quat2.copy(camera.current.quaternion, flyCamera.quaternion);
    }

    sceneCamera.position.fromArray(camera.current.position);
    sceneCamera.quaternion.fromArray(camera.current.quaternion);
  });

  return camera.current;
};
