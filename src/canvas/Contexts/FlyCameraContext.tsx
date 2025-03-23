import { useFrame } from "@react-three/fiber";
import { quat, quat2, ReadonlyQuat, ReadonlyQuat2, vec3 } from "gl-matrix";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from "react";

const defaultForward = vec3.fromValues(0, 0, 1);
const defaultFlyCameraState = {
  active: false,
  gameUp: vec3.fromValues(0, 1, 0),
  defaultForward,
  forward: vec3.clone(defaultForward),
  rightward: vec3.create(),
  upward: vec3.create(),
  backward: vec3.create(),
  leftward: vec3.create(),
  downward: vec3.create(),
  position: vec3.fromValues(40, 10, 40),
  quaternion: quat2.create(),
  rotateX: -Math.PI * 0.15,
  rotateY: Math.PI * 0.25,
  rotateXLimits: { min: -Math.PI * 0.5, max: Math.PI * 0.5 },
  activate: function (
    position: vec3 | null = null,
    quaternion: quat2 | null = null
  ) {
    this.active = true;

    if (position !== null && quaternion !== null) {
      // Position
      vec3.copy(this.position, position);

      // Rotations
      const rotatedForward = vec3.clone(this.defaultForward);
      vec3.transformQuat(
        rotatedForward,
        rotatedForward,
        quaternion as ReadonlyQuat
      );

      // Rotation Y
      const rotatedYForward = vec3.clone(rotatedForward);
      rotatedYForward[1] = 0;
      this.rotateY = vec3.angle(this.defaultForward, rotatedYForward);

      if (vec3.dot(rotatedForward, vec3.fromValues(1, 0, 0)) < 0)
        this.rotateY *= -1;

      // Rotation X
      this.rotateX = vec3.angle(rotatedForward, rotatedYForward);

      if (vec3.dot(rotatedForward, vec3.fromValues(0, 1, 0)) > 0)
        this.rotateX *= -1;
    }
  },
  deactivate: function () {
    this.active = false;
  },
};

const FlyCameraContext = createContext(defaultFlyCameraState);

export const useFlyCameraContext = () => {
  return useContext(FlyCameraContext);
};

export const FlyCameraContextProvider = ({ children }: PropsWithChildren) => {
  const value = useFlyCameraState();

  return (
    <FlyCameraContext.Provider value={value}>
      {children}
    </FlyCameraContext.Provider>
  );
};

export const useFlyCameraState = () => {
  const ref = useRef(defaultFlyCameraState);

  useEffect(() => {
    const fly = ref.current;
    const { gameUp, forward, rightward, upward, backward, leftward, downward } =
      fly;

    vec3.cross(rightward, gameUp, forward);
    vec3.cross(upward, forward, rightward);
    vec3.negate(backward, forward);
    vec3.negate(leftward, rightward);
    vec3.negate(downward, upward);
  }, []);

  useFrame(() => {});

  return ref.current;
};
