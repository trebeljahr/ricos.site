import { FiChevronDown, FiX } from "@components/Icons";
import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useScrollLock } from "src/hooks/useScrollLock";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";
import data from "../../../.velite/r3f-links.json";

type Scene = { name: string; url: string };

const sections = Object.entries(data.links) as [string, Scene[]][];

// Preview PNGs live flat under /assets/pages/ for most categories, but
// controllers + dungeon scenes were organized under /assets/pages/r3f/.
// Pick the folder based on the route so previews don't 404.
const NESTED_PREFIXES = ["/r3f/controllers/", "/r3f/dungeon/"];
const previewSrc = ({ name, url }: Scene) =>
  NESTED_PREFIXES.some((p) => url.startsWith(p))
    ? `/assets/pages/r3f/${name}.png`
    : `/assets/pages/${name}.png`;

const pathWithoutQuery = (asPath: string) => asPath.split(/[?#]/)[0];

// Inside the collapsed pill (radius 26px, 8px padding) hover shapes need an
// 18px radius to follow its curve: fully round on the 36px controls. An
// explicit 18px, unlike rounded-full, animates evenly back to rounded-md.
const hoverShape = (round?: boolean) =>
  clsx(
    "transition-[border-radius,background-color] duration-300 motion-reduce:transition-none",
    round ? "rounded-[18px]" : "rounded-md",
  );

/** "/ 3D Playground" next to the site logo: the way back to the playground index. */
export function PlaygroundCrumb({ round }: { round?: boolean }) {
  return (
    <>
      <span aria-hidden="true" className="text-sm text-gray-400 dark:text-gray-500">
        /
      </span>
      <Link
        href="/r3f"
        className={clsx(
          "truncate px-1.5 py-1 text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
          hoverShape(round),
        )}
      >
        3D Playground
      </Link>
    </>
  );
}

type ScenesButtonProps = {
  open: boolean;
  onClick: () => void;
  /** Pill-shaped hover, for the collapsed immersive navbar. */
  round?: boolean;
  className?: string;
};

export function PlaygroundScenesButton({ open, onClick, round, className }: ScenesButtonProps) {
  return (
    <button
      type="button"
      data-scenes-toggle=""
      aria-expanded={open}
      aria-controls="playground-scenes"
      onClick={onClick}
      className={clsx(
        "inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm sm:px-2.5 hover:bg-gray-200 dark:hover:bg-gray-700",
        hoverShape(round),
        open && "bg-gray-200 dark:bg-gray-700",
        className,
      )}
    >
      scenes
      <FiChevronDown
        className={clsx(
          "size-3 transition-transform duration-200 motion-reduce:transition-none",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

type PanelProps = {
  open: boolean;
  onClose: () => void;
  /** Where focus goes after closing from inside the panel. Defaults to the element focused before opening. */
  restoreFocus?: () => void;
};

/**
 * Scene list for the 3D playground. Render it as a direct child of a navbar
 * header: it drops down from the bottom edge of the bar, so the site nav
 * stays visible above it.
 *
 * Links stay in the server-rendered HTML (the closed panel is only hidden
 * and inert), so every demo stays reachable for crawlers. The preview
 * images mount on first open, so demo pages don't download ~40 PNGs.
 */
export function PlaygroundScenesPanel({ open, onClose, restoreFocus }: PanelProps) {
  const router = useRouter();
  const current = pathWithoutQuery(router.asPath);
  const panelRef = useRef<HTMLDivElement>(null);
  const [hasOpened, setHasOpened] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setHasOpened(true);
    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const currentLink = panel?.querySelector<HTMLElement>("nav a[aria-current]");
    // Centre the current scene inside the list without scrolling the page.
    const list = panel?.querySelector("nav");
    if (list && currentLink) {
      list.scrollTop = currentLink.offsetTop - list.clientHeight / 2 + currentLink.offsetHeight / 2;
    }
    // Next task: when opened with Enter, the keypress of that same Enter
    // would otherwise land on the newly focused link and follow it.
    const focusTimer = window.setTimeout(() => {
      (currentLink ?? panel?.querySelector<HTMLElement>("a"))?.focus({ preventScroll: true });
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      // Only hand focus back when it was still in the panel; a click into the
      // scene should leave focus with the scene.
      if (!panel?.contains(document.activeElement)) return;
      if (restoreFocus) window.setTimeout(restoreFocus, 0);
      else previousFocus?.focus();
    };
  }, [open, onClose, restoreFocus]);

  // Close after navigating to another scene.
  useEffect(() => {
    router.events.on("routeChangeStart", onClose);
    return () => router.events.off("routeChangeStart", onClose);
  }, [router.events, onClose]);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          "absolute inset-x-0 top-full h-[calc(100dvh-100%)] cursor-default bg-black/30 transition-opacity duration-200 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panelRef}
        id="playground-scenes"
        inert={!open}
        className={clsx(
          "absolute inset-x-0 top-full flex h-[calc(100dvh-100%)] flex-col overflow-hidden bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100",
          // A sidebar flush with the left edge and the bottom of the bar; its
          // content lines up with the logo via the same horizontal padding.
          "sm:right-auto sm:w-[28rem] sm:border-t sm:border-r sm:border-gray-200 xl:w-[31rem] sm:dark:border-gray-800",
          "duration-200 ease-out motion-reduce:transition-none",
          // Visibility flips at once when opening, so the list can take focus
          // straight away, and waits for the fade when closing.
          open
            ? "visible translate-y-0 opacity-100 transition-[opacity,translate]"
            : "invisible -translate-y-2 opacity-0 transition-[opacity,translate,visibility]",
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 py-2 pr-2 pl-3 xl:pl-10 dark:border-gray-800">
          <Link
            href="/r3f"
            aria-current={current === "/r3f" ? "page" : undefined}
            className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            All demos on one page
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <span className="sr-only">Close scene list</span>
            <FiX className="size-5" />
          </button>
        </div>
        <nav
          aria-label="Scenes"
          className="relative overflow-y-auto overscroll-contain pr-3 pb-6 pl-2 xl:pl-9"
        >
          {sections.map(([section, scenes]) => (
            <div key={section} className="mt-5">
              <h2 className="px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {section}
              </h2>
              <ul className="mt-2 grid grid-cols-2 gap-3">
                {scenes.map((scene) => {
                  const isCurrent = current === scene.url;
                  return (
                    <li key={scene.url}>
                      {/* Each demo ships its own multi-MB three.js bundle: no viewport prefetch. */}
                      <Link
                        href={scene.url}
                        prefetch={false}
                        aria-current={isCurrent ? "page" : undefined}
                        className={clsx(
                          "group block rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800",
                          isCurrent && "bg-gray-100 ring-2 ring-myBlue dark:bg-gray-800",
                        )}
                      >
                        <span className="block aspect-video overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800">
                          {hasOpened && (
                            <ImageWithLoader
                              src={previewSrc(scene)}
                              alt=""
                              width={320}
                              height={180}
                              sizes="200px"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                            />
                          )}
                        </span>
                        <span
                          className={clsx(
                            "block truncate px-1 pt-1.5 pb-0.5 text-sm",
                            isCurrent && "font-semibold",
                          )}
                        >
                          {turnKebabIntoTitleCase(scene.name)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}

/** Preview grid of every demo, grouped by section. Used on the playground index. */
export function PlaygroundSceneGrid() {
  return (
    <div className="not-prose">
      {sections.map(([section, scenes]) => (
        <section key={section} className="mt-12">
          <h2 className="text-2xl font-bold">{section}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {scenes.map((scene) => (
              <li key={scene.url}>
                <Link
                  href={scene.url}
                  prefetch={false}
                  className="group block overflow-hidden rounded-lg ring-1 ring-gray-200 hover:ring-gray-400 dark:ring-gray-800 dark:hover:ring-gray-600"
                >
                  <span className="block aspect-video overflow-hidden">
                    <ImageWithLoader
                      src={previewSrc(scene)}
                      alt=""
                      width={400}
                      height={225}
                      sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="block px-3 py-2 font-medium">
                    {turnKebabIntoTitleCase(scene.name)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
