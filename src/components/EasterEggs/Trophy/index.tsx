import { Sprite } from "@components/Sprite";
import dynamic from "next/dynamic";
import { EmojiButton } from "../EmojiButton";

export const TrophyEgg = dynamic(() => import("./TrophyEgg"), {
  ssr: false,
  loading: () => (
    <EmojiButton label="Trophy">
      <Sprite name="🏆" />
    </EmojiButton>
  ),
});
