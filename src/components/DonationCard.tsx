import clsx from "clsx";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimate,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, type SVGProps, useEffect, useId, useRef, useState } from "react";
import {
  type DonationMode,
  defaultDonationMode,
  hasAnyStripeLinks,
  hasMonthlyLinks,
  hasOneTimeLink,
  hasOtherDoors,
  isInQuietPeriod,
  manageDonationUrl,
  monthlyOptions,
  oneTimeUrl,
  otherDoors,
  SITE_REFERENCE,
  SUPPORTED_AT_STORAGE_KEY,
  withReference,
} from "src/lib/donation";
import useLocalStorageState from "use-local-storage-state";
import { ExternalLink } from "./ExternalLink";
import { SiBuymeacoffee, SiKofi, SiPatreon, SiPaypal, SiWise } from "./Icons";

type DonationCardProps = {
  className?: string;
};

type FullCardProps = DonationCardProps & {
  // Tags each Stripe payment with where the donor came from: a project slug
  // from /donate?from=<slug>, or ricos.site itself.
  reference?: string;
  title?: string;
};

type ThanksProps = DonationCardProps & {
  // The project the donor came from, when it has a site to go back to.
  backTo?: { name: string; href: string; icon?: string };
  message?: string;
};

// localStorage is only readable after hydration; until then every surface
// renders its server markup so the page does not shift.
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
}

export function useDonationSupportedAt() {
  return useLocalStorageState<number | null>(SUPPORTED_AT_STORAGE_KEY, {
    defaultValue: null,
  });
}

// SVG ids must be unique per instance (the dev gallery renders every box
// twice) and plain enough to sit inside url(#…).
function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

// Each door's mark on its own brand color, so the row reads at a glance. A
// door without an entry here still renders, just without a badge.
const doorLogos: Record<
  string,
  { Icon: (props: SVGProps<SVGSVGElement>) => ReactNode; className: string }
> = {
  PayPal: { Icon: SiPaypal, className: "bg-[#002991] text-white" },
  Wise: { Icon: SiWise, className: "bg-[#9FE870] text-[#163300]" },
  "Ko-fi": { Icon: SiKofi, className: "bg-[#FF6433] text-white" },
  "Buy Me a Coffee": { Icon: SiBuymeacoffee, className: "bg-[#FFDD00] text-black" },
  Patreon: { Icon: SiPatreon, className: "bg-black text-white dark:bg-white dark:text-black" },
};

function DoorLogo({ name }: { name: string }) {
  const logo = doorLogos[name];
  if (!logo) return null;
  return (
    <span
      className={clsx(
        "flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform duration-300 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110",
        logo.className,
      )}
    >
      <logo.Icon className="size-5" />
    </span>
  );
}

const doorClass =
  "donation-option group flex items-center rounded-md border-2 border-gray-200 no-underline transition-colors hover:border-accent dark:border-gray-700";

// The doors that do not run through Stripe, after the Stripe options. PayPal
// and Wise get a tile with a line on when to use them; the platforms people
// already know sit together in one row, logo and name only.
function OtherDoors() {
  if (!hasOtherDoors) return null;
  const described = otherDoors.filter((door) => door.blurb);
  const platforms = otherDoors.filter((door) => !door.blurb);
  // A subsection gap, so it reads as its own section after Stripe.
  return (
    <div className="mt-sub">
      <p className="m-0 text-sm font-semibold donation-muted text-gray-600 dark:text-gray-300">
        Other ways to buy me a coffee
      </p>
      {described.length > 0 && (
        <div className="mt-label grid gap-tight sm:grid-cols-2">
          {described.map((door) => (
            <ExternalLink
              key={door.name}
              href={door.url}
              className={clsx(doorClass, "min-h-14 gap-label px-3 py-3 sm:last:odd:col-span-2")}
            >
              <DoorLogo name={door.name} />
              <span className="flex flex-col">
                <span className="font-semibold donation-ink text-gray-900 dark:text-white">
                  {door.name}
                </span>
                <span className="mt-hair text-sm donation-muted text-gray-600 dark:text-gray-300">
                  {door.blurb}
                </span>
              </span>
            </ExternalLink>
          ))}
        </div>
      )}
      {platforms.length > 0 && (
        <div
          className="mt-tight grid gap-tight"
          style={{ gridTemplateColumns: `repeat(${platforms.length}, minmax(0, 1fr))` }}
        >
          {platforms.map((door) => (
            <ExternalLink
              key={door.name}
              href={door.url}
              className={clsx(
                doorClass,
                "flex-col justify-start gap-tight px-2 py-3 text-center sm:flex-row sm:gap-label sm:px-3 sm:text-left",
              )}
            >
              <DoorLogo name={door.name} />
              <span className="text-sm leading-tight font-semibold donation-ink text-gray-900 sm:text-base dark:text-white">
                {door.name}
              </span>
            </ExternalLink>
          ))}
        </div>
      )}
    </div>
  );
}

const modeLabels: [DonationMode, string][] = [
  ["monthly", "Monthly"],
  ["once", "One-time"],
];

// The highlight is one shared layout element, so it slides from one button to
// the other instead of jumping.
function ModeToggle({
  mode,
  onChange,
}: {
  mode: DonationMode;
  onChange: (mode: DonationMode) => void;
}) {
  const pillId = useId();
  return (
    <div className="donation-toggle mt-para inline-flex rounded-md border-2 border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900">
      {modeLabels.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={clsx(
            "relative min-w-24 rounded-sm px-4 py-2 text-sm font-semibold transition-colors",
            mode === value
              ? "donation-ink text-gray-900 dark:text-white"
              : "donation-muted text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
          )}
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
        >
          {mode === value && (
            <motion.span
              layoutId={pillId}
              aria-hidden
              className="donation-selection absolute inset-0 rounded-sm bg-white shadow-sm dark:bg-gray-700"
              transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Grows or shrinks to the height of whatever the toggle shows, so the doors
// below glide instead of jumping. The -m-1/p-1 pair keeps focus rings inside
// the clipped box.
function AutoHeight({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className="-m-1 overflow-hidden"
      initial={false}
      animate={{ height }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div ref={innerRef} className="p-1">
        {children}
      </div>
    </motion.div>
  );
}

const panelVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.3, duration: 0.45 } },
};

const tileClass =
  "donation-option group relative flex h-full flex-col rounded-md border-2 border-gray-200 no-underline transition-[border-color,box-shadow,translate] duration-200 hover:border-accent hover:shadow-md motion-safe:hover:-translate-y-0.5 dark:border-gray-700 dark:hover:shadow-black/40";

/** The full card. Lives on /donate only. */
export function DonationCard({
  className,
  reference = SITE_REFERENCE,
  title = "Buy me a coffee ☕",
}: FullCardProps) {
  const isMounted = useIsMounted();
  const [mode, setMode] = useState<DonationMode>(defaultDonationMode);
  const showStripe = isMounted && hasAnyStripeLinks;
  // The monthly/once toggle only earns its place when both exist.
  const showToggle = hasMonthlyLinks && hasOneTimeLink;
  const monthlyTiles = monthlyOptions.filter((option) => option.href);
  const showMonthly = showToggle ? mode === "monthly" : hasMonthlyLinks;

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={clsx("not-prose w-full", className)}
        aria-labelledby="donation-card-title"
      >
        <div className="donation-surface rounded-lg border-4 border-gray-200 bg-white px-5 py-10 dark:border-gray-700 dark:bg-gray-800">
          <h2
            id="donation-card-title"
            className="m-0 text-2xl font-bold donation-ink text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          <p className="mt-label mb-0 max-w-prose donation-muted text-gray-700 dark:text-gray-200">
            One coffee or one every month. Both keep me making things.
          </p>

          {showStripe && (
            <>
              {showToggle && <ModeToggle mode={mode} onChange={setMode} />}

              <div className="mt-stack">
                <AutoHeight>
                  <AnimatePresence mode="wait" initial={false}>
                    {showMonthly ? (
                      <motion.div
                        key="monthly"
                        className="grid gap-label sm:grid-cols-2"
                        variants={panelVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                      >
                        {monthlyTiles.map((option) => (
                          <motion.div key={option.label} variants={tileVariants}>
                            <ExternalLink
                              href={option.href ? withReference(option.href, reference) : "#"}
                              className={clsx(tileClass, "min-h-28 justify-between px-4 py-3")}
                            >
                              {option.emoji && (
                                <span aria-hidden className="self-end mb-2 text-2xl leading-none">
                                  {option.emoji}
                                </span>
                              )}
                              <span className="text-xl font-bold donation-ink text-gray-900 dark:text-white">
                                {option.label} / month
                              </span>
                              <span className="mt-tight text-sm donation-muted text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-gray-100">
                                {option.note}
                              </span>
                            </ExternalLink>
                          </motion.div>
                        ))}
                        {manageDonationUrl && (
                          <motion.p
                            variants={tileVariants}
                            className="m-0 text-sm donation-muted text-gray-600 sm:col-span-2 dark:text-gray-300"
                          >
                            Change or cancel your monthly support at any time:{" "}
                            <ExternalLink
                              href={manageDonationUrl}
                              className="font-semibold text-accent hover:underline"
                            >
                              Manage monthly donation
                            </ExternalLink>
                            .
                          </motion.p>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="once"
                        variants={panelVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                      >
                        <motion.div variants={tileVariants}>
                          <ExternalLink
                            href={oneTimeUrl ? withReference(oneTimeUrl, reference) : "#"}
                            className={clsx(tileClass, "min-h-20 justify-center px-5 py-4")}
                          >
                            <span className="text-xl font-bold donation-ink text-gray-900 dark:text-white">
                              Pick your own amount
                            </span>
                            <span className="mt-tight text-sm donation-muted text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-gray-100">
                              You choose on the next page. EUR 10 suggested, EUR 1 minimum.
                            </span>
                          </ExternalLink>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </AutoHeight>
              </div>
            </>
          )}

          <OtherDoors />
        </div>
      </section>
    </MotionConfig>
  );
}

const stripButtonClass =
  "donation-option inline-flex items-center rounded-md border-2 border-gray-200 px-4 py-2 font-semibold donation-ink text-gray-900 no-underline transition-colors hover:border-accent dark:border-gray-700 dark:text-white";

/**
 * One sentence and a link to the donation page, for the end of a long post. The reader has
 * finished, so the ask is earned. Goes quiet for a while after a donation
 * (see /donate?thanks=1), and never appears on short pages.
 */
export function DonationStrip({ className }: DonationCardProps) {
  const isMounted = useIsMounted();
  const [supportedAt] = useDonationSupportedAt();

  if (isMounted && isInQuietPeriod(supportedAt)) return null;

  return (
    <aside
      aria-label="Support this site"
      className={clsx(
        "not-prose rounded-lg border-2 border-gray-200 px-5 py-6 dark:border-gray-700",
        className,
      )}
    >
      <p className="m-0 font-semibold donation-ink text-gray-900 dark:text-white">
        Free to read. Not free to make.
      </p>
      <p className="mt-tight mb-0 max-w-prose donation-muted text-gray-700 dark:text-gray-200">
        If this piece was worth something to you, buy me a coffee. It keeps the place ad-free and
        gives me room for the next one.
      </p>
      <div className="mt-stack flex flex-wrap items-center gap-tight">
        <Link href="/donate" className={stripButtonClass}>
          Buy me a coffee
        </Link>
      </div>
    </aside>
  );
}

// The thanks moment, in order: the heart draws its outline, then fills up from
// the bottom while the heading runs through thank-yous in other languages,
// each long enough to read. When "Thank you" lands the heart is full: it
// beats and throws out a ring of hearts and sparkles, a few more hearts float
// off, and the note fades in. Under reduced motion it is all there, still.
const THANKS_WORDS = ["Danke", "Gracias", "Merci", "Obrigado", "Arigatō", "Thank you"];
const WORD_START_S = 0.4;
const WORD_STEP_S = 0.65;
const LAND_S = WORD_START_S + WORD_STEP_S * (THANKS_WORDS.length - 1);
const OUTLINE_S = 1.1;

const HEART_PATH =
  "M24 41C24 41 6 30.5 6 17.5 6 11.5 10.5 7 16.2 7 19.7 7 22.6 8.9 24 11.8 25.4 8.9 28.3 7 31.8 7 37.5 7 42 11.5 42 17.5 42 30.5 24 41 24 41Z";
// The two sides of the heart, drawn together from the dip down to the tip.
const HEART_HALVES = [
  "M24 11.8C22.6 8.9 19.7 7 16.2 7 10.5 7 6 11.5 6 17.5 6 30.5 24 41 24 41",
  "M24 11.8C25.4 8.9 28.3 7 31.8 7 37.5 7 42 11.5 42 17.5 42 30.5 24 41 24 41",
];
const SPARKLE_PATH =
  "M24 0C24 0 25.3 14.6 29.6 18.4 33.9 22.2 48 24 48 24 48 24 33.9 25.8 29.6 29.6 25.3 33.4 24 48 24 48 24 48 22.7 33.4 18.4 29.6 14.1 25.8 0 24 0 24 0 24 14.1 22.2 18.4 18.4 22.7 14.6 24 0 24 0Z";

const burstColors = ["text-rose-400", "text-amber-300", "text-pink-400", "text-accent"];

// Fixed, not random, so every visit gets the same well-spaced ring.
const burst = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08);
  const distance = [92, 72, 82][i % 3];
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    path: i % 2 ? SPARKLE_PATH : HEART_PATH,
    color: burstColors[i % burstColors.length],
    size: i % 3 === 0 ? 14 : 10,
    rotate: ((i * 47) % 60) - 30,
  };
});

const floaters = [
  { x: -30, drift: -12, size: 12, color: "text-rose-400" },
  { x: 18, drift: 10, size: 10, color: "text-pink-400" },
  { x: -8, drift: 8, size: 14, color: "text-rose-300" },
  { x: 34, drift: -8, size: 9, color: "text-amber-300" },
  { x: -40, drift: 6, size: 10, color: "text-pink-300" },
];

// Once the heart has finished its beats it can be squeezed: it squishes, glows
// warm, a few faint hearts drift up and sparkles twinkle out around it. Quick
// clicks build a combo that makes each burst a little bigger.
const COMBO_WINDOW_MS = 700;
const MAX_COMBO = 6;
const SPARKLE_S = 1.2;
const FLOAT_S = 1.6;
const MAX_DELAY_S = 0.3;
const POP_MS = (FLOAT_S + MAX_DELAY_S) * 1000;
const MAX_POPS = 5;

// Soft yellows and teals, a little deeper on the light card so they still show.
const sparkleColors = [
  "text-amber-300 dark:text-amber-200",
  "text-yellow-300 dark:text-yellow-200",
  "text-teal-300 dark:text-teal-200",
  "text-sky-300 dark:text-sky-200",
];

type PopParticle = {
  kind: "heart" | "sparkle";
  x: number;
  y: number;
  size: number;
  rotate: number;
  delay: number;
  color: string;
};

type Pop = { id: number; particles: PopParticle[] };

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function makePop(id: number, combo: number): Pop {
  const sparkles = Array.from({ length: 10 + combo * 2 }, (): PopParticle => {
    const angle = Math.random() * Math.PI * 2;
    const distance = randomBetween(38, 62 + combo * 5);
    return {
      kind: "sparkle",
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: randomBetween(6, 13),
      rotate: randomBetween(-90, 90),
      delay: randomBetween(0, MAX_DELAY_S),
      color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
    };
  });
  const hearts = Array.from(
    { length: 3 + Math.floor(combo / 2) },
    (): PopParticle => ({
      kind: "heart",
      x: randomBetween(-40, 40),
      y: -randomBetween(60, 95),
      size: randomBetween(9, 15),
      rotate: randomBetween(-20, 20),
      delay: randomBetween(0, MAX_DELAY_S * 0.6),
      color: "text-pink-300",
    }),
  );
  return { id, particles: [...sparkles, ...hearts] };
}

function ThanksWord({ play, still }: { play: boolean; still: boolean }) {
  const last = THANKS_WORDS.length - 1;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!play) return;
    const timers = THANKS_WORDS.slice(1).map((_, i) =>
      window.setTimeout(() => setIndex(i + 1), (WORD_START_S + WORD_STEP_S * (i + 1)) * 1000),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [play]);

  if (still) return <span aria-hidden>Thank you</span>;

  const current = index;
  const landed = current === last;

  return (
    <span aria-hidden className="inline-grid justify-items-center">
      <AnimatePresence initial={false}>
        <motion.span
          key={THANKS_WORDS[current]}
          className={clsx(
            "col-start-1 row-start-1 whitespace-nowrap",
            landed &&
              "bg-linear-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text pb-1 text-transparent dark:from-rose-400 dark:via-pink-400 dark:to-amber-300",
          )}
          initial={
            landed
              ? { opacity: 0, y: "0.3em", scale: 0.8, filter: "blur(6px)" }
              : { opacity: 0, y: "0.35em", filter: "blur(4px)" }
          }
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-0.35em", filter: "blur(4px)", transition: { duration: 0.22 } }}
          transition={
            landed
              ? { type: "spring", bounce: 0.5, duration: 0.7 }
              : { duration: 0.3, ease: "easeOut" }
          }
        >
          {THANKS_WORDS[current]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function BeatingHeart({ play, still }: { play: boolean; still: boolean }) {
  const gradientId = useSvgId("donation-heart");
  const fillClipId = useSvgId("donation-heart-fill");
  const [beatsDone, setBeatsDone] = useState(false);
  const ready = still || beatsDone;
  const [pops, setPops] = useState<Pop[]>([]);
  const [squishScope, animate] = useAnimate<HTMLSpanElement>();
  const glowRef = useRef<HTMLSpanElement>(null);
  const nextPop = useRef(0);
  const combo = useRef({ count: 0, at: 0 });
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
    };
  }, []);

  const squeeze = () => {
    // A warm glow behind the heart. Under reduced motion that is all it does.
    if (glowRef.current) {
      animate(
        glowRef.current,
        still ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 0], scale: [0.8, 1.3, 1.15] },
        { duration: 1, ease: "easeOut" },
      );
    }
    if (still) return;

    const now = performance.now();
    const last = combo.current;
    const count = now - last.at < COMBO_WINDOW_MS ? Math.min(last.count + 1, MAX_COMBO) : 0;
    combo.current = { count, at: now };

    // A soft squish, tilting left and right on alternate clicks.
    const tilt = (count % 2 ? 1 : -1) * (4 + count);
    animate(
      squishScope.current,
      {
        scale: [1, 0.88, 1.12 + count * 0.015, 0.97, 1.02, 1],
        rotate: [0, tilt, -tilt * 0.6, tilt * 0.25, 0, 0],
      },
      { duration: 0.6, ease: "easeOut" },
    );

    const id = nextPop.current++;
    setPops((current) => [...current.slice(-(MAX_POPS - 1)), makePop(id, count)]);
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      setPops((current) => current.filter((pop) => pop.id !== id));
    }, POP_MS);
    timers.current.add(t);
  };

  return (
    <button
      type="button"
      aria-label="Squeeze the heart"
      disabled={!ready}
      onClick={squeeze}
      // Stops a burst of clicks from selecting the text around the heart.
      onMouseDown={(event) => event.preventDefault()}
      className={clsx(
        "relative mx-auto flex size-28 touch-manipulation select-none appearance-none items-center justify-center rounded-full border-0 bg-transparent p-0 transition-[scale] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        ready && "motion-safe:hover:scale-105",
      )}
    >
      <span
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute inset-5 rounded-full bg-pink-300/60 opacity-0 blur-xl dark:bg-pink-400/40"
      />
      {play && (
        <motion.div
          className="absolute inset-4 rounded-full bg-rose-400/40 blur-2xl dark:bg-rose-500/30"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0.55], scale: [0.6, 1.25, 1] }}
          transition={{ delay: LAND_S - 0.1, duration: 1.4, ease: "easeOut" }}
        />
      )}

      {play &&
        burst.map((particle, i) => (
          <motion.svg
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed list, never reordered
            key={i}
            viewBox="0 0 48 48"
            width={particle.size}
            height={particle.size}
            className={clsx("absolute", particle.color)}
            style={{
              left: `calc(50% - ${particle.size / 2}px)`,
              top: `calc(50% - ${particle.size / 2}px)`,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: particle.x,
              y: particle.y,
              scale: [0, 1.15, 0.6],
              opacity: [0, 1, 0],
              rotate: particle.rotate,
            }}
            transition={{ delay: LAND_S, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <path d={particle.path} fill="currentColor" />
          </motion.svg>
        ))}

      {play &&
        floaters.map((floater, i) => (
          <motion.svg
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed list, never reordered
            key={i}
            viewBox="0 0 48 48"
            width={floater.size}
            height={floater.size}
            className={clsx("absolute", floater.color)}
            style={{ left: `calc(50% + ${floater.x}px)`, top: "40%" }}
            initial={{ y: 0, x: 0, opacity: 0, scale: 0.6 }}
            animate={{
              y: -120,
              x: [0, floater.drift, -floater.drift / 2, floater.drift],
              opacity: [0, 0.85, 0],
              scale: 1,
            }}
            transition={{ delay: LAND_S + 0.5 + i * 0.35, duration: 2.6, ease: "easeOut" }}
          >
            <path d={HEART_PATH} fill="currentColor" />
          </motion.svg>
        ))}

      {pops.map((pop) =>
        pop.particles.map((particle, i) => (
          <motion.svg
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed per pop, never reordered
            key={`${pop.id}-${i}`}
            viewBox="0 0 48 48"
            width={particle.size}
            height={particle.size}
            className={clsx(
              "pointer-events-none absolute",
              particle.color,
              particle.kind === "sparkle" && "drop-shadow-[0_0_3px_currentColor]",
            )}
            style={{
              left: `calc(50% - ${particle.size / 2}px)`,
              top: `calc(50% - ${particle.size / 2}px)`,
            }}
            {...(particle.kind === "sparkle"
              ? {
                  // Twinkles on the spot while it drifts a little further out.
                  initial: { x: particle.x * 0.45, y: particle.y * 0.45, scale: 0, opacity: 0 },
                  animate: {
                    x: particle.x,
                    y: particle.y,
                    scale: [0, 1.2, 0.7, 1.05, 0],
                    opacity: [0, 1, 1, 1, 0],
                    rotate: particle.rotate,
                  },
                  transition: { duration: SPARKLE_S, delay: particle.delay, ease: "easeOut" },
                }
              : {
                  // Rises off the top of the heart with a slow sway, like warmth.
                  initial: { x: 0, y: -12, scale: 0.3, opacity: 0 },
                  animate: {
                    x: [0, particle.x * 0.5, particle.x * 0.2, particle.x],
                    y: particle.y,
                    scale: [0.3, 1, 0.9],
                    opacity: [0, 0.85, 0.85, 0],
                    rotate: particle.rotate,
                  },
                  transition: { duration: FLOAT_S, delay: particle.delay, ease: "easeOut" },
                })}
          >
            <path d={particle.kind === "sparkle" ? SPARKLE_PATH : HEART_PATH} fill="currentColor" />
          </motion.svg>
        )),
      )}

      <span ref={squishScope} className="relative flex">
        <motion.svg
          viewBox="0 0 48 48"
          className="size-18 overflow-visible drop-shadow-[0_6px_14px_rgb(244_63_94/0.35)]"
          animate={play ? { scale: [1, 1.18, 0.95, 1.1, 1] } : undefined}
          transition={{
            delay: LAND_S,
            duration: 0.7,
            times: [0, 0.2, 0.4, 0.6, 1],
            repeat: 2,
            repeatDelay: 0.9,
          }}
          onAnimationComplete={() => setBeatsDone(true)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" className="text-rose-400" stopColor="currentColor" />
              <stop offset="1" className="text-pink-600" stopColor="currentColor" />
            </linearGradient>
            {/* A rising rectangle that reveals the fill, like the heart filling up. */}
            <clipPath id={fillClipId}>
              <motion.rect
                x="0"
                width="48"
                height="48"
                initial={{ attrY: 48 }}
                animate={play ? { attrY: 0 } : undefined}
                transition={{
                  delay: OUTLINE_S - 0.2,
                  duration: LAND_S - OUTLINE_S + 0.2,
                  ease: "easeInOut",
                }}
              />
            </clipPath>
          </defs>
          <path
            d={HEART_PATH}
            fill={`url(#${gradientId})`}
            clipPath={still ? undefined : `url(#${fillClipId})`}
          />
          {!still &&
            HEART_HALVES.map((half) => (
              <motion.path
                key={half}
                d={half}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={play ? { pathLength: 1, opacity: 0 } : undefined}
                transition={{
                  pathLength: { duration: OUTLINE_S, ease: [0.65, 0, 0.35, 1] },
                  opacity: { delay: LAND_S, duration: 0.3 },
                }}
              />
            ))}
          <motion.ellipse
            cx="15.5"
            cy="15.5"
            rx="4.2"
            ry="2.6"
            transform="rotate(-40 15.5 15.5)"
            fill="white"
            initial={still ? false : { opacity: 0 }}
            animate={play ? { opacity: 0.45 } : undefined}
            style={still ? { opacity: 0.45 } : undefined}
            transition={{ delay: LAND_S, duration: 0.4 }}
          />
        </motion.svg>
      </span>
    </button>
  );
}

/** Replaces the card on /donate after Stripe sends the donor back. */
export function DonationThanks({ className, backTo, message }: ThanksProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Wait until the card is actually on screen, so nobody misses the moment.
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const isMounted = useIsMounted();
  const reducedMotion = useReducedMotion();
  const still = isMounted && reducedMotion === true;
  const play = isMounted && inView && !still;

  return (
    <section
      className={clsx("not-prose w-full", className)}
      aria-labelledby="donation-thanks-title"
    >
      <div
        ref={ref}
        className="relative overflow-hidden donation-surface rounded-lg border-4 border-gray-200 bg-white px-5 pt-8 pb-10 text-center dark:border-gray-700 dark:bg-gray-800"
      >
        {/* In the project's colour when the donor came from one (.donation-brand). */}
        <div
          aria-hidden
          className="donation-thanks-rule absolute inset-x-0 top-0 h-1 bg-linear-to-r from-rose-400 via-pink-400 to-amber-300 in-[.donation-brand]:bg-none in-[.donation-brand]:bg-accent"
        />
        <div
          aria-hidden
          className="donation-thanks-glow pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-rose-50 to-transparent dark:from-rose-500/10"
        />

        <div className="relative">
          <BeatingHeart play={play} still={still} />

          <h2
            id="donation-thanks-title"
            className="mt-tight mb-0 text-3xl font-bold donation-ink text-gray-900 dark:text-white"
          >
            <span className="sr-only">Thank you</span>
            <ThanksWord play={play} still={still} />
          </h2>

          <motion.div
            key={still ? "still" : "animated"}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={play || still ? { opacity: 1, y: 0 } : undefined}
            transition={
              still
                ? { duration: 0 }
                : { delay: LAND_S + 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <p className="mx-auto mt-label mb-0 max-w-md donation-muted text-gray-700 dark:text-gray-200">
              {message ??
                "Thanks for the coffee. It means a lot to me, and it buys me time to make the next thing."}{" "}
              Your receipt comes by email.
            </p>
            <p className="mt-para mb-0 font-serif text-lg italic donation-muted text-gray-700 dark:text-gray-200">
              — Rico
            </p>
            {backTo && (
              <p className="mt-stack mb-0">
                <a href={backTo.href} className={clsx(stripButtonClass, "gap-label")}>
                  {backTo.icon && (
                    <Image
                      src={backTo.icon}
                      alt=""
                      aria-hidden="true"
                      width={24}
                      height={24}
                      className="size-6 rounded-md"
                    />
                  )}
                  Back to {backTo.name}
                </a>
              </p>
            )}
            {manageDonationUrl && (
              <p className="mt-stack mb-0 text-sm">
                <ExternalLink
                  href={manageDonationUrl}
                  className="font-semibold text-accent hover:underline"
                >
                  Manage monthly donation
                </ExternalLink>
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
