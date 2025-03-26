import { useFrame, useThree } from "@react-three/fiber";
import { createContext, PropsWithChildren, useContext, useState } from "react";

export const waterHeight = 45;

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

  useFrame(() => {
    if (camera.position.y > waterHeight) {
      if (underwater) {
        setUnderwater(false);
      }
    } else {
      if (!underwater) {
        setUnderwater(true);
      }
    }
  });

  return (
    <UnderwaterContext.Provider value={{ underwater }}>
      {children}
    </UnderwaterContext.Provider>
  );
};
