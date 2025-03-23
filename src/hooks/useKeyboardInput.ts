import { useEffect } from "react";

export function useKeyboardInput(newListener: (event: KeyboardEvent) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      newListener(event);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [newListener]);
}

export function useSubscribeToKeyPress(
  desiredKey: Chars,
  callback: () => void
) {
  useKeyboardInput((event) => {
    if (event.key.toLowerCase() === desiredKey.toLowerCase()) {
      callback();
    }
  });
}

export type Chars =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | " "
  | "Enter"
  | "Escape"
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Backspace"
  | "Delete"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "0";
