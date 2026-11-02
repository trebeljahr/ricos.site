import { Sprite } from "@components/Sprite";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { whenIdle } from "src/lib/whenIdle";
import { EmojiButton } from "../EmojiButton";

// The pencil at rest, until the egg and the animation library behind it arrive.
// Done by hand because next/dynamic's `loading` never sees `children`.
export const PenEgg = ({ children }: { children: ReactNode }) => {
  const [Egg, setEgg] = useState<ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    whenIdle()
      .then(() => import("./PenEgg"))
      .then((module) => setEgg(() => module.default));
  }, []);

  if (Egg) return <Egg>{children}</Egg>;

  return (
    <>
      <EmojiButton label="Pencil" className="z-10">
        <span className="inline-block">
          <Sprite name="✏️" />
        </span>
      </EmojiButton>{" "}
      <span className="relative inline-block">{children}</span>
    </>
  );
};
