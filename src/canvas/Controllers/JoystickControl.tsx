import { useJoystick, JoystickData } from "@hooks/useJoystick";
import { useFrame, useThree } from "@react-three/fiber";
import { ReactNode, useRef, useCallback, useEffect } from "react";
import { Euler, MathUtils, Object3D, Vector3 } from "three";

// Reused from first-person controller
const _euler = new Euler(0, 0, 0, "YXZ");
const _PI_2 = Math.PI / 2;
const maxPolarAngle = Math.PI;
const minPolarAngle = 0;

export interface JoystickControllerRef {
  getCameraJoystickData: () => JoystickData | null;
  getMovementJoystickData: () => JoystickData | null;
}

interface JoystickControlProps {
  enabled?: boolean;
  mode?: "first-person" | "third-person";
  children?: ReactNode;
  cameraJoystickPosition?: { x: string; y: string };
  movementJoystickPosition?: { x: string; y: string };
  onCameraJoystickMove?: (data: JoystickData) => void;
  onMovementJoystickMove?: (data: JoystickData) => void;
}

export const JoystickControl = ({
  enabled = true,
  mode = "third-person",
  children,
  cameraJoystickPosition = { x: "85%", y: "15%" },
  movementJoystickPosition = { x: "15%", y: "15%" },
  onCameraJoystickMove,
  onMovementJoystickMove,
}: JoystickControlProps) => {
  const camera = useThree((state) => state.camera);
  const cameraJoystickDataRef = useRef<JoystickData | null>(null);
  const movementJoystickDataRef = useRef<JoystickData | null>(null);
  const direction = useRef(new Vector3());
  const frontVector = useRef(new Vector3());
  const sideVector = useRef(new Vector3());

  // First-person camera rotation handler
  const handleFirstPersonCameraRotation = useCallback(
    (data: JoystickData) => {
      const rotationSpeed = 0.005;
      _euler.setFromQuaternion(camera.quaternion);

      _euler.y -= data.leveledX * rotationSpeed;
      _euler.x += data.leveledY * rotationSpeed;

      _euler.x = Math.max(
        _PI_2 - maxPolarAngle,
        Math.min(_PI_2 - minPolarAngle, _euler.x)
      );

      camera.quaternion.setFromEuler(_euler);
      cameraJoystickDataRef.current = data;
      onCameraJoystickMove?.(data);
    },
    [camera, onCameraJoystickMove]
  );

  // Third-person camera rotation handler
  const handleThirdPersonCameraRotation = useCallback(
    (data: JoystickData) => {
      cameraJoystickDataRef.current = data;
      onCameraJoystickMove?.(data);
    },
    [onCameraJoystickMove]
  );

  // Movement joystick handler
  const handleMovementJoystick = useCallback(
    (data: JoystickData) => {
      movementJoystickDataRef.current = data;
      onMovementJoystickMove?.(data);
    },
    [onMovementJoystickMove]
  );

  // Camera joystick
  useJoystick({
    cb:
      mode === "first-person"
        ? handleFirstPersonCameraRotation
        : handleThirdPersonCameraRotation,
    params: {
      x: cameraJoystickPosition.x,
      y: cameraJoystickPosition.y,
      opacity: enabled ? 0.5 : 0,
      joystickClass: "camera-joystick",
      containerClass: "camera-joystick-container",
    },
  });

  // Movement joystick
  useJoystick({
    cb: handleMovementJoystick,
    params: {
      x: movementJoystickPosition.x,
      y: movementJoystickPosition.y,
      opacity: enabled ? 0.5 : 0,
      joystickClass: "movement-joystick",
      containerClass: "movement-joystick-container",
    },
  });

  return <>{children}</>;
};

// Hook to use the joystick data
export const useJoystickMovement = () => {
  const { current: frontVector } = useRef(new Vector3());
  const { current: sideVector } = useRef(new Vector3());
  const { current: direction } = useRef(new Vector3());
  const movementJoystick = useJoystick({
    params: { x: "15%", y: "15%" },
  });
  const cameraJoystick = useJoystick({
    params: { x: "85%", y: "15%" },
  });

  const getMovementDirection = (camera: Object3D, speed: number) => {
    const joystickData = movementJoystick.getData();
    if (!joystickData) return new Vector3();

    const { leveledX, leveledY } = joystickData;
    frontVector.set(0, 0, -leveledY);
    sideVector.set(-leveledX, 0, 0);

    return direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation);
  };

  return {
    movementJoystick,
    cameraJoystick,
    getMovementDirection,
  };
};
