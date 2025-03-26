import { ModularCharacterController } from "@r3f/Controllers/ModularCharacterController";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { Obstacles } from "@r3f/Helpers/Obstacles";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useControls } from "leva";
import { MixamoCharacterNames } from "@r3f/Characters/Character";

const seoInfo = {
  title: "Modular Character Controller",
  description:
    "A flexible character controller with options for first-person, third-person, and joystick/keyboard controls.",
  url: "/r3f/controllers",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "joystick",
    "first-person",
    "third-person",
    "controller",
  ],
  image: "/assets/pages/r3f/controllers/modular-controller.png",
  imageAlt:
    "A modular character controller with first-person and third-person options",
};

export default function Page() {
  // Controls for character and view mode
  const { mode, enableJoystick, characterName, fixedCamera } = useControls({
    mode: {
      value: "third-person",
      options: ["first-person", "third-person"],
      label: "View Mode",
    },
    enableJoystick: {
      value: true,
      label: "Enable Joystick",
    },
    characterName: {
      value: MixamoCharacterNames.XBot,
      options: Object.values(MixamoCharacterNames),
      label: "Character",
    },
    fixedCamera: {
      value: false,
      label: "Fixed Camera",
    },
  });

  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <Sky sunPosition={[100, 20, 100]} />

        <Physics debug={false}>
          <ModularCharacterController
            defaultMode={mode as "first-person" | "third-person"}
            enableJoystick={enableJoystick}
            position={[0, 5, 0]}
            fixedCamera={fixedCamera}
            characterName={characterName as MixamoCharacterNames}
          />
          <Obstacles />
        </Physics>
      </CanvasWithKeyboardInput>

      {/* Instructions overlay */}
      <div className="fixed left-0 top-0 z-10 bg-black/50 p-4 text-white text-sm rounded-br-md">
        <h2 className="font-bold mb-2">Controls:</h2>
        <ul className="list-disc pl-5">
          <li>WASD/Arrow Keys - Move</li>
          <li>Space - Jump</li>
          <li>Shift - Sprint</li>
          <li>V - Toggle First/Third Person</li>
          <li>Mouse/Touch - Look around</li>
        </ul>
        <div className="mt-2">
          <p>
            Use the controls panel to toggle joystick mode and camera settings.
          </p>
        </div>
      </div>
    </ThreeFiberLayout>
  );
}
