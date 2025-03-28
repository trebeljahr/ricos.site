import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";
import { useThree } from "@react-three/fiber";
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { debugCamera } from "../ChunkGenerationSystem/config";

const temp = new Vector3();
const tempQuaternion = new Quaternion();
const tempEuler = new Euler();

export const CameraPositionLogger = () => {
  const { camera } = useThree();

  useSubscribeToKeyPress("t", () => {
    console.info(
      "local position",
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    camera.getWorldPosition(temp);
    console.info("world position", temp.x, temp.y, temp.z);
    camera instanceof PerspectiveCamera &&
      console.info("fov", camera.fov, "near", camera.near, "far", camera.far);
  });

  useSubscribeToKeyPress("r", () => {
    console.info(
      "local rotation",
      camera.rotation.x,
      camera.rotation.y,
      camera.rotation.z
    );

    camera.getWorldQuaternion(tempQuaternion);
    console.info(
      "world quaternion",
      tempQuaternion.x,
      tempQuaternion.y,
      tempQuaternion.z,
      tempQuaternion.w
    );

    tempEuler.setFromQuaternion(tempQuaternion);
    console.info("world rotation", tempEuler.x, tempEuler.y, tempEuler.z);
  });

  return null;
};
