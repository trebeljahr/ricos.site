import { Sprite } from "@components/Sprite";
import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EmojiButton } from "../EmojiButton";

export const ClockEgg = dynamic(() => whenIdle().then(() => import("./ClockEgg")), {
  ssr: false,
  loading: () => (
    <EmojiButton label="Clock" nudge={false}>
      <span className="inline-block">
        <Sprite name="🕓" />
      </span>
    </EmojiButton>
  ),
});
