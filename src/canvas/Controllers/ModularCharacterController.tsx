import { useState, useEffect } from "react";
import { FirstPersonControllerWithJoystick } from "./FirstPersonControllerWithJoystick";
import { EcctrlControllerWithJoystick } from "./EcctrlControllerWithJoystick";
import { MixamoCharacterNames } from "../Characters/Character";
import { ModelType } from "./EcctrlControllerWithJoystick";

export interface ModularCharacterControllerProps {
  defaultMode?: "first-person" | "third-person";
  enableJoystick?: boolean;
  position?: [number, number, number];
  fixedCamera?: boolean;
  showModel?: boolean;
  characterName?: MixamoCharacterNames | string;
  Model?: ModelType;
}

export const ModularCharacterController = ({
  defaultMode = "third-person",
  enableJoystick = true,
  position = [0, 0, 5],
  fixedCamera = false,
  showModel = true,
  characterName = MixamoCharacterNames.XBot,
  Model,
}: ModularCharacterControllerProps) => {
  const [mode, setMode] = useState<"first-person" | "third-person">(
    defaultMode
  );

  // Toggle between first-person and third-person modes
  const toggleMode = () => {
    setMode(mode === "first-person" ? "third-person" : "first-person");
  };

  // Set up keyboard controls for toggling modes
  useEffect(() => {
    // Listen for the 'V' key to toggle modes
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "v" || e.key === "V") {
        toggleMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Render the appropriate controller based on the current mode
  return (
    <>
      {mode === "first-person" ? (
        <FirstPersonControllerWithJoystick
          enableJoystick={enableJoystick}
          position={position}
        />
      ) : (
        <EcctrlControllerWithJoystick
          Model={Model}
          position={position}
          enableJoystick={enableJoystick}
          fixedCamera={fixedCamera}
          characterName={characterName as MixamoCharacterNames}
        />
      )}
    </>
  );
};
