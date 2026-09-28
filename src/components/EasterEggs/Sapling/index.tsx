import { Sprite } from "@components/Sprite";
import dynamic from "next/dynamic";
import { EmojiButton } from "../EmojiButton";
import { PLANT_GAP } from "./plantGap";

export const SaplingEgg = dynamic(() => import("./SaplingEgg"), {
  ssr: false,
  loading: () => (
    <EmojiButton label="Seedling" className={PLANT_GAP}>
      <Sprite name="🌱" />
    </EmojiButton>
  ),
});
