import { Sprite } from "@components/Sprite";
import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EmojiButton } from "../EmojiButton";

export const MonkeyEgg = dynamic(() => whenIdle().then(() => import("./MonkeyEgg")), {
  ssr: false,
  loading: () => (
    <EmojiButton label="Monkey">
      <Sprite name="🙊" />
    </EmojiButton>
  ),
});
