import dynamic from "next/dynamic";
import { EmojiButton } from "../EmojiButton";

export const NeedleEgg = dynamic(() => import("./NeedleEgg"), {
  ssr: false,
  loading: () => <EmojiButton label="Haystack">🌾</EmojiButton>,
});
