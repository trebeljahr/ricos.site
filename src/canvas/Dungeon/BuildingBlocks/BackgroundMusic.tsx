import ambientLoop from "@sounds/ambient-pads-loop.mp3";
import { useEffect } from "react";
import useSound from "use-sound";

export const BackgroundMusicLoop = () => {
  const [play, { stop }] = useSound(ambientLoop, { volume: 0.2, loop: true });
  useEffect(() => {
    play();
    return () => {
      stop();
    };
  }, [play, stop]);

  return null;
};
