import { EmojiButton } from "@components/EasterEggs/EmojiButton";
import type { ReactNode } from "react";

type HandButtonProps = {
  children: ReactNode;
  onClick?: () => void;
};

export const HandButton = ({ children, onClick }: HandButtonProps) => (
  <EmojiButton label="Wave back" onClick={onClick}>
    {children}
  </EmojiButton>
);
