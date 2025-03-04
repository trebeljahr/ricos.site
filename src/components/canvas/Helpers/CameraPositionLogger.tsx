import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";
import { useThree } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import { debugCamera } from "../ChunkGenerationSystem/config";

const temp = new Vector3();
const tempQuaternion = new Quaternion();
const tempEuler = new Euler();

export const CameraPositionLogger = () => {
  const { camera } = useThree();

  useSubscribeToKeyPress("t", () => {
    if (!debugCamera) return;

    console.log(
      "local position",
      camera.position.x,
      camera.position.y,
      camera.position.y
    );

    camera.getWorldPosition(temp);
    console.log("world position", temp.x, temp.y, temp.z);
  });

  useSubscribeToKeyPress("r", () => {
    if (!debugCamera) return;

    console.log(
      "local rotation",
      camera.rotation.x,
      camera.rotation.y,
      camera.rotation.y
    );

    camera.getWorldQuaternion(tempQuaternion);
    console.log(
      "world quaternion",
      tempQuaternion.x,
      tempQuaternion.y,
      tempQuaternion.z,
      tempQuaternion.w
    );

    tempEuler.setFromQuaternion(tempQuaternion);
    console.log("world rotation", tempEuler.x, tempEuler.y, tempEuler.z);
  });

  return null;
};
