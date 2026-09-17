import dynamic from "next/dynamic";
import { EmojiButton } from "../EmojiButton";

export const TrophyEgg = dynamic(() => import("./TrophyEgg"), {
  ssr: false,
  loading: () => <EmojiButton label="Trophy">🏆</EmojiButton>,
});
