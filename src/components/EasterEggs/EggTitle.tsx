import { Sprite } from "@components/Sprite";
import type { SpriteName } from "src/lib/sprites";
import { EmojiButton } from "./EmojiButton";

type EggTitleProps = { text: string; emoji: SpriteName; label: string };

/** Static stand-in for a lazily loaded egg: the heading text and an inert emoji button. */
export const EggTitle = ({ text, emoji, label }: EggTitleProps) => (
  <>
    {text}{" "}
    <EmojiButton label={label}>
      <Sprite name={emoji} />
    </EmojiButton>
  </>
);
