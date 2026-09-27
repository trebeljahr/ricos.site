import clsx from "clsx";
import { type SpriteName, spriteSrc } from "src/lib/sprites";

type SpriteProps = {
  name: SpriteName;
  /** Empty by default: most sprites sit inside a labelled button or are decoration. */
  alt?: string;
  className?: string;
};

/**
 * An emoji drawn as an image, so it looks the same on every platform. It is
 * 1em square and sits on the baseline like the glyph would, so font-size and
 * text classes size it just as they sized the emoji.
 */
export const Sprite = ({ name, alt = "", className }: SpriteProps) => (
  // biome-ignore lint/performance/noImgElement: a static 160px sprite needs no image optimisation
  <img
    src={spriteSrc(name)}
    alt={alt}
    width={160}
    height={160}
    draggable={false}
    decoding="async"
    className={clsx("inline-block size-[1em] max-w-none align-[-0.125em] select-none", className)}
  />
);
