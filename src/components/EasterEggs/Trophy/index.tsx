import { Sprite } from "@components/Sprite";
import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EmojiButton } from "../EmojiButton";

export const TrophyEgg = dynamic(() => whenIdle().then(() => import("./TrophyEgg")), {
  ssr: false,
  loading: () => (
    <EmojiButton label="Trophy">
      <Sprite name="🏆" />
    </EmojiButton>
  ),
});
