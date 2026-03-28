import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";

export function RayCaster() {
  useSubscribeToKeyPress("r", () => {});
  return null;
}
