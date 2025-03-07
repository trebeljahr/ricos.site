import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";

export function RayCaster() {
  useSubscribeToKeyPress("r", () => {
    console.info("Trying to cast a ray");
  });
  return null;
}
