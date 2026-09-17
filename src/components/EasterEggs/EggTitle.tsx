import { EmojiButton } from "./EmojiButton";

type EggTitleProps = { text: string; emoji: string; label: string };

/** Static stand-in for a lazily loaded egg: the heading text and an inert emoji button. */
export const EggTitle = ({ text, emoji, label }: EggTitleProps) => (
  <>
    {text} <EmojiButton label={label}>{emoji}</EmojiButton>
  </>
);
