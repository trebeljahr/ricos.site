import dynamic from "next/dynamic";
import { EmojiButton } from "../EmojiButton";

export const SaplingEgg = dynamic(() => import("./SaplingEgg"), {
  ssr: false,
  loading: () => <EmojiButton label="Seedling">🌱</EmojiButton>,
});
