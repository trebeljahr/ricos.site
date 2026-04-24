import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";
import { useThree } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";

const temp = new Vector3();
const tempQuaternion = new Quaternion();
const tempEuler = new Euler();

export const CameraPositionLogger = () => {
  const { camera } = useThree();

  useSubscribeToKeyPress("t", () => {
    camera.getWorldPosition(temp);
  });

  useSubscribeToKeyPress("r", () => {
    camera.getWorldQuaternion(tempQuaternion);
    tempEuler.setFromQuaternion(tempQuaternion);
  });

  return null;
};
