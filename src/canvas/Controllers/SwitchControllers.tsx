import { useKeyboardInput } from "@hooks/useKeyboardInput";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import type { ModelType } from "./EcctrlController";
import { FirstPersonController } from "./FirstPersonController";
import { MinecraftSpectatorController } from "./MinecraftCreativeController";
import { SwimmingController } from "./SwimmingController";
import { ThirdPersonController } from "./ThirdPersonController";

type PossibleControllers =
  | "FirstPersonController"
  | "SwimmingController"
  | "MinecraftCreativeController"
  | "ThirdPersonController"
  | "FirstPersonController";

export const SwitchController = ({ Model }: { Model: ModelType }) => {
  const [controller, setController] = useState<PossibleControllers>("MinecraftCreativeController");

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
        return MinecraftSpectatorController;
      case "FirstPersonController":
        return FirstPersonController;
      case "ThirdPersonController":
        return ThirdPersonController;
      default:
        return OrbitControls;
    }
  }, [controller]);

  return <Controller Model={Model} />;
};
