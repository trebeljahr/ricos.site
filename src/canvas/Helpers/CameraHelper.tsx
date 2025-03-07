import { useThree } from "@react-three/fiber";

export const CameraHelperComponent = () => {
  const { camera } = useThree();
  return <cameraHelper args={[camera]} />;
};
