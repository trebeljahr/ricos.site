import { Sprite } from "@components/Sprite";
import { type RefObject, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { PageLayer, pageBox } from "../PageLayer";

const DINO_SIZE = 48;
// How much of the dinosaur shows past the screen edge: just the tail.
const PEEK = 24;
// Room above the dinosaur for the hop and the walking bob. The emoji also
// draws well outside its own font box, so both margins are measured from the
// ink rather than from the 48px box.
const HEADROOM = 34;
const WALK_PX_PER_S = 165;
const TURN_MS = 560;
// One full stride: two footfalls. Short enough that the feet keep up with the
// ground speed, so the walk reads as strides rather than a float.
const STRIDE_MS = 420;
// Clearance under the feet, for the emoji's descender plus the dip and the
// tilt of a footfall.
const FOOTROOM = 26;
// A walking dinosaur carries its weight forward, so the body keeps a small
// constant tilt and the gait rocks around it.
const LEAN = 1.6;
// Walking home after the bump, it hurries: quicker strides, higher steps.
const TROT_PX_PER_S = 270;
const TROT_STRIDE_MS = 300;
// How far the sprite's nose sits in from the left of its box, and how far the
// head may pass over the title before the neck meets the last letter.
const NOSE = 1;
const OVERLAP = 4;
const RECOIL = 12;
const RETURN_AFTER_MS = 4000;

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Row = { top: number; width: number; scrollX: number };
type Facing = 1 | -1;

const titleOf = (anchorRef: RefObject<HTMLElement | null>) =>
  anchorRef.current?.querySelector("h1") ?? anchorRef.current;

/** Where the title's text ends, in viewport pixels. A heading's box runs the full width. */
function textRight(el: Element) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().right;
}

/**
 * A hop that turns the dinosaur around in the air. Mirroring a flat emoji has
 * to pass through zero width, so the flip happens at the top of the hop and
 * lasts about a tenth of a second: it reads as a spin rather than a blink.
 */
function turnAround(el: HTMLElement, fromX: number, toX: number, from: Facing) {
  const to = -from;
  const at = (t: number) => Math.round(fromX + (toX - fromX) * t);
  return el.animate(
    [
      { transform: `translateX(${fromX}px) translateY(0) scale(${from}, 1)` },
      {
        transform: `translateX(${at(0.3)}px) translateY(-15px) scale(${from}, 1.06)`,
        offset: 0.36,
      },
      { transform: `translateX(${at(0.7)}px) translateY(-16px) scale(${to}, 1.06)`, offset: 0.54 },
      { transform: `translateX(${toX}px) translateY(0) scale(${to * 1.1}, 0.9)`, offset: 0.84 },
      { transform: `translateX(${toX}px) translateY(0) scale(${to}, 1)` },
    ],
    { duration: TURN_MS, easing: "ease-in-out", fill: "forwards" },
  ).finished;
}

/**
 * Two footfalls a stride. Each one dips and squashes on contact, then pushes
 * off and stretches through the pass. The body rocks from side to side as the
 * weight changes feet, around a slight forward lean, and leaving the ground is
 * fast while the top of the arc is slow.
 */
function stride(el: HTMLElement | null, ms: number, lift: number) {
  const contact = (tilt: number) => ({
    transform: `translateY(2px) rotate(${LEAN + tilt}deg) scale(1.06, 0.94)`,
  });
  const pass = { transform: `translateY(-${lift}px) rotate(${LEAN}deg) scale(0.97, 1.05)` };
  return el?.animate(
    [
      contact(-2.2),
      { ...pass, offset: 0.25, easing: "ease-out" },
      { ...contact(2.2), offset: 0.5, easing: "ease-in" },
      { ...pass, offset: 0.75, easing: "ease-out" },
      { ...contact(-2.2), easing: "ease-in" },
    ],
    { duration: ms, iterations: Number.POSITIVE_INFINITY },
  );
}

function travel(el: HTMLElement, fromX: number, toX: number, facing: Facing, pxPerS: number) {
  return el.animate(
    [
      { transform: `translateX(${fromX}px) scaleX(${facing})` },
      { transform: `translateX(${toX}px) scaleX(${facing})` },
    ],
    {
      duration: (Math.abs(toX - fromX) / pxPerS) * 1000,
      easing: "linear",
      fill: "forwards",
    },
  ).finished;
}

/**
 * Easter egg for /timeline: a dinosaur hides past the right edge of the screen
 * with only its tail showing. The tail wiggles now and then. Click it and the
 * dinosaur turns around, walks into the page title, shakes its head at it, and
 * trots back off the way it came.
 */
const DinoTail = ({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) => {
  const recordFind = useRecordEggFind();
  const dinoRef = useRef<HTMLSpanElement>(null);
  // Travel and gait live on separate elements. Sharing one would compose the
  // gait's rotation with the long walking translation, and a rotated
  // translation throws the dinosaur tens of pixels up and down.
  const gaitRef = useRef<HTMLSpanElement>(null);
  const huhRef = useRef<HTMLSpanElement>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [walking, setWalking] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Line up with the anchor (the page title) and follow resizes.
  useEffect(() => {
    const measure = () => {
      const anchor = titleOf(anchorRef);
      if (!anchor) return;
      const box = pageBox(anchor);
      setRow({
        // Puts the dinosaur itself, not its clipping strip, level with the title.
        top: box.top + box.height / 2 - DINO_SIZE / 2 - HEADROOM,
        width: document.documentElement.clientWidth,
        scrollX: window.scrollX,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchorRef]);

  // Coming back, it backs in past the edge rather than appearing there.
  const wasAway = useRef(false);
  useEffect(() => {
    if (hidden) {
      wasAway.current = true;
      return;
    }
    if (!wasAway.current) return;
    wasAway.current = false;
    if (calm()) return;
    dinoRef.current?.animate(
      [
        { transform: `translateX(${PEEK + 12}px) scaleX(-1)` },
        { transform: "translateX(0) scaleX(-1)" },
      ],
      { duration: 800, easing: "ease-out" },
    );
  }, [hidden]);

  // An occasional wiggle so the tail reads as alive and clickable.
  useEffect(() => {
    if (walking || hidden || calm()) return;
    const timer = window.setInterval(() => {
      dinoRef.current?.animate(
        [
          { rotate: "0deg" },
          { rotate: "-9deg" },
          { rotate: "7deg" },
          { rotate: "-4deg" },
          { rotate: "0deg" },
        ],
        { duration: 600, easing: "ease-in-out" },
      );
    }, 3200);
    return () => window.clearInterval(timer);
  }, [walking, hidden]);

  const walk = async () => {
    const dino = dinoRef.current;
    if (walking || !dino || !row) return;
    setWalking(true);
    recordFind("dino");

    if (calm()) {
      await dino.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" })
        .finished;
    } else {
      // The dinosaur's box starts at `rest`; every x below is an offset from it.
      const rest = row.width - PEEK;
      const title = titleOf(anchorRef);
      const wall = title ? textRight(title) + window.scrollX - row.scrollX : 0;
      const turned = -DINO_SIZE;
      const bump = Math.min(turned, wall - OVERLAP - NOSE - rest);
      const recoiled = bump + RECOIL;

      await turnAround(dino, 0, turned, -1);
      const walkSteps = stride(gaitRef.current, STRIDE_MS, 7);
      await travel(dino, turned, bump, 1, WALK_PX_PER_S);
      walkSteps?.cancel();

      // Bump: squashed against the letters, then knocked back onto its tail
      // while the title takes the knock too.
      title?.animate(
        [
          { translate: "0" },
          { translate: "-4px 0", offset: 0.25 },
          { translate: "1px 0", offset: 0.6 },
          { translate: "0" },
        ],
        { duration: 360, easing: "ease-out" },
      );
      await dino.animate(
        [
          { transform: `translateX(${bump}px) translateY(0) rotate(0deg) scale(1, 1)` },
          {
            transform: `translateX(${bump + 1}px) translateY(0) rotate(0deg) scale(0.86, 1.08)`,
            offset: 0.12,
          },
          {
            transform: `translateX(${bump + RECOIL * 0.8}px) translateY(-7px) rotate(7deg) scale(1.03, 0.98)`,
            offset: 0.45,
          },
          {
            transform: `translateX(${recoiled}px) translateY(0) rotate(-2deg) scale(1.06, 0.94)`,
            offset: 0.78,
          },
          { transform: `translateX(${recoiled}px) translateY(0) rotate(0deg) scale(1, 1)` },
        ],
        { duration: 420, easing: "ease-out", fill: "forwards" },
      ).finished;

      // Confused: a question mark pops up and the dinosaur shakes its head.
      huhRef.current?.animate(
        [
          { opacity: 0, transform: "translateY(6px) scale(0.5)" },
          { opacity: 1, transform: "translateY(-2px) scale(1.15)", offset: 0.12 },
          { opacity: 1, transform: "translateY(0) scale(1) rotate(-8deg)", offset: 0.3 },
          { opacity: 1, transform: "translateY(0) scale(1) rotate(8deg)", offset: 0.55 },
          { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", offset: 0.8 },
          { opacity: 0, transform: "translateY(-4px) scale(0.9)" },
        ],
        { duration: 1300, easing: "ease-in-out" },
      );
      await gaitRef.current?.animate(
        [
          { transform: "rotate(0deg) translateX(0)" },
          { transform: "rotate(-7deg) translateX(-1px)", offset: 0.14 },
          { transform: "rotate(6deg) translateX(1px)", offset: 0.28 },
          { transform: "rotate(-5deg) translateX(-1px)", offset: 0.42 },
          { transform: "rotate(4deg) translateX(1px)", offset: 0.56 },
          { transform: "rotate(-2deg) translateX(0)", offset: 0.7 },
          { transform: "rotate(0deg) translateX(0)" },
        ],
        { duration: 1000, easing: "ease-in-out", endDelay: 300 },
      ).finished;

      const homeward = recoiled + 28;
      await turnAround(dino, recoiled, homeward, 1);
      const trotSteps = stride(gaitRef.current, TROT_STRIDE_MS, 9);
      // Far enough right that the whole body is past the edge.
      await travel(dino, homeward, PEEK + 8, -1, TROT_PX_PER_S);
      trotSteps?.cancel();
    }
    setHidden(true);
    setWalking(false);
    // Back behind the edge a little later, tail first.
    window.setTimeout(() => setHidden(false), RETURN_AFTER_MS);
  };

  if (!row || hidden) return null;

  return (
    <PageLayer>
      {/* Clipped to the viewport width, so the hidden body never adds scroll. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: row.scrollX,
          top: row.top,
          width: row.width,
          height: HEADROOM + DINO_SIZE + FOOTROOM,
        }}
      >
        <button
          type="button"
          aria-label="Dinosaur tail"
          onClick={walk}
          className="pointer-events-auto absolute cursor-pointer appearance-none border-0 bg-transparent p-0 leading-none"
          style={{
            left: row.width - PEEK,
            bottom: FOOTROOM,
            width: walking ? DINO_SIZE : PEEK,
            height: DINO_SIZE,
          }}
        >
          <span
            ref={dinoRef}
            aria-hidden="true"
            className="absolute bottom-0 left-0 inline-block origin-[50%_80%]"
            // The emoji faces left; mirrored it faces away, tail first toward the page.
            style={{ transform: "scaleX(-1)" }}
          >
            {/* Only shown while it faces the page, so it is never drawn mirrored. */}
            <span
              ref={huhRef}
              className="absolute bottom-full left-0.5 font-bold text-3xl leading-none opacity-0"
            >
              ?
            </span>
            <span
              ref={gaitRef}
              className="inline-block origin-[50%_100%]"
              style={{ fontSize: DINO_SIZE, lineHeight: 1 }}
            >
              <Sprite name="🦕" />
            </span>
          </span>
        </button>
      </div>
    </PageLayer>
  );
};

export default DinoTail;
