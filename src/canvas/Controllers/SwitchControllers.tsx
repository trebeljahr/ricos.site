import { OrbitControls, useKeyboardControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import { SwimmingController } from "./SwimmingController";
import { MinecraftCreativeController } from "./MinecraftCreativeController";
import { FirstPersonController } from "./FirstPersonController";
import { ThirdPersonController } from "./ThirdPersonController";
import { useKeyboardInput } from "@hooks/useKeyboardInput";

type PossibleControllers =
  | "FirstPersonController"
  | "SwimmingController"
  | "MinecraftCreativeController"
  | "ThirdPersonController"
  | "FirstPersonController";

export const SwitchController = () => {
  const [controller, setController] = useState<PossibleControllers>(
    "MinecraftCreativeController"
  );

  useKeyboardInput(({ key }) => {
    switch (key) {
      case "1":
        setController("FirstPersonController");
        break;
      case "2":
        setController("SwimmingController");
        break;
      case "3":
        setController("MinecraftCreativeController");
        break;
      case "4":
        setController("ThirdPersonController");
        break;
    }
  });
  const Controller = useMemo(() => {
    switch (controller) {
      case "SwimmingController":
        return SwimmingController;
      case "MinecraftCreativeController":
        return MinecraftCreativeController;
      case "FirstPersonController":
        return FirstPersonController;
      case "ThirdPersonController":
        return ThirdPersonController;
      default:
        return OrbitControls;
    }
  }, [controller]);

  return <Controller />;
};
