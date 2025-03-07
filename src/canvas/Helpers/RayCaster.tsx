import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";

export function RayCaster() {
  useSubscribeToKeyPress("r", () => {
    console.log("RayCaster");
  });
  return null;
}
