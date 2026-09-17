import dynamic from "next/dynamic";
import { EmojiButton } from "../EmojiButton";

export const MonkeyEgg = dynamic(() => import("./MonkeyEgg"), {
  ssr: false,
  loading: () => <EmojiButton label="Monkey">🙊</EmojiButton>,
});
