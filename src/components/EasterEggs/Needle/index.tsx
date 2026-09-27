import clsx from "clsx";
import dynamic from "next/dynamic";
import { Haystack } from "./Haystack";
import { PILE, PILE_H, PILE_W, SIZE } from "./pile";

/** The bales standing still, until the interactive pile has loaded. */
const StillPile = () => (
  <>
    {PILE.map((at) => (
      <span
        key={`${at.x}-${at.y}`}
        className="absolute leading-none"
        style={{ left: at.x, top: at.y, width: SIZE }}
      >
        <Haystack size={SIZE} />
      </span>
    ))}
  </>
);

// Client only, which keeps motion out of the page bundle. The server renders
// the same bales standing still, so nothing pops in or shifts.
const Pile = dynamic(() => import("./NeedleEgg"), { ssr: false, loading: StillPile });

/**
 * Easter egg for /needlestack: a pile of hay bales with a fixed place in the
 * page. The pile has a box of its own, so it sits in the same spot on every
 * visit and never covers the text.
 */
export const NeedleEgg = ({ className }: { className?: string }) => (
  <div
    className={clsx("not-prose relative select-none", className)}
    style={{ width: PILE_W, height: PILE_H }}
  >
    <Pile />
  </div>
);
