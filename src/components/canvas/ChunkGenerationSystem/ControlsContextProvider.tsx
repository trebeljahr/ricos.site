import { useControls } from "leva";
import { createContext, PropsWithChildren, useContext } from "react";

type ControlsContext = {
  speed: number;
  heightNoiseScale: number;
  biomeNoiseScale: number;
  moistureNoiseScale: number;
  resolution: number;
  mode: "height" | "biome" | "moisture" | "debug" | "landscape";
};

const ControlsContext = createContext({} as ControlsContext);

export const useControlsContext = () => {
  return useContext(ControlsContext);
};

export const ControlsContextProvider = ({ children }: PropsWithChildren) => {
  const controls = useControls({
    speed: { value: 25, min: 1, max: 50, step: 1 },
    heightNoiseScale: { value: 0.02, min: 0.0001, max: 0.1, step: 0.0001 },
    biomeNoiseScale: { value: 0.005, min: 0.0001, max: 0.1, step: 0.0001 },
    moistureNoiseScale: { value: 0.004, min: 0.0001, max: 0.1, step: 0.0001 },
    resolution: { value: 32, min: 2, max: 128, step: 1 },
    mode: {
      value: "height" as ControlsContext["mode"],
      options: ["height", "biome", "moisture", "debug", "landscape"],
    },
  });

  return (
    <ControlsContext.Provider
      value={{
        ...controls,
        mode: controls.mode as ControlsContext["mode"],
      }}
    >
      {children}
    </ControlsContext.Provider>
  );
};
