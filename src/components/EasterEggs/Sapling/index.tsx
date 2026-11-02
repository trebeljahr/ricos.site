import { Sprite } from "@components/Sprite";
import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EmojiButton } from "../EmojiButton";
import { PLANT_GAP } from "./plantGap";

export const SaplingEgg = dynamic(() => whenIdle().then(() => import("./SaplingEgg")), {
  ssr: false,
  loading: () => (
    <EmojiButton label="Seedling" className={PLANT_GAP}>
      <Sprite name="🌱" />
    </EmojiButton>
  ),
});
