import { useFrame, useThree } from "@react-three/fiber";
import { createContext, type PropsWithChildren, useContext, useState } from "react";
import { evaluateWaveHeight, WATER_LEVEL } from "src/canvas/Scenes/UnderwaterShader/waterPresets";

export const waterHeight = WATER_LEVEL;
export const surfaceLevel = waterHeight;
export const farUnderwater = 50;
export const farOverwater = 100;

type UnderwaterContextType = {
  underwater: boolean;
};

const UnderwaterContext = createContext({} as UnderwaterContextType);

export const useUnderwaterContext = () => {
  return useContext(UnderwaterContext);
};

export const UnderwaterContextProvider = ({ children }: PropsWithChildren) => {
  const { camera } = useThree();
  const [underwater, setUnderwater] = useState(true);

  useFrame((state) => {
    const waveY =
      waterHeight +
      evaluateWaveHeight(camera.position.x, camera.position.z, state.clock.elapsedTime);
    if (camera.position.y > waveY) {
      if (underwater) {
        setUnderwater(false);
      }
    } else {
      if (!underwater) {
        setUnderwater(true);
      }
    }
  });

  return <UnderwaterContext.Provider value={{ underwater }}>{children}</UnderwaterContext.Provider>;
};
