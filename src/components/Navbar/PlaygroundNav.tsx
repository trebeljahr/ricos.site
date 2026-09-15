import { FiX } from "@components/Icons";
import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/** "/ 3D Playground" next to the site logo: the way back to the playground index. */
export function PlaygroundCrumb() {
  return (
    <>
      <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
        /
      </span>
      <Link
        href="/r3f"
        className="truncate rounded-md px-1.5 py-1 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        3D Playground
      </Link>
    </>
  );
}

type ScenesButtonProps = {
  open: boolean;
  onClick: () => void;
  className?: string;
};

export function PlaygroundScenesButton({ open, onClick, className }: ScenesButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="playground-scenes"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700",
        className,
      )}
    >
      scenes
    </button>
  );
}

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Scene list for the 3D playground. Links stay in the server-rendered HTML
 * (the drawer is only translated off-screen and made inert), so every demo
 * stays reachable for crawlers from every demo page.
 */
export function PlaygroundDrawer({ open, onClose }: DrawerProps) {
  const router = useRouter();
  const current = pathWithoutQuery(router.asPath);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const returnFocusTo = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (
      panel?.querySelector<HTMLElement>("nav a[aria-current]") ?? panel?.querySelector("a")
    )?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnFocusTo?.focus();
    };
  }, [open, onClose]);

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
          "fixed inset-0 z-1002 cursor-default bg-black/40 transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panelRef}
        id="playground-scenes"
        role="dialog"
        aria-label="3D playground scenes"
        inert={!open}
        className={clsx(
          "not-prose fixed inset-y-0 left-0 z-1003 flex w-72 max-w-[85vw] flex-col bg-white text-gray-900 shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900 dark:text-gray-100",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-gray-800">
          <Link
            href="/r3f"
            aria-current={current === "/r3f" ? "page" : undefined}
            className="rounded-md px-2 py-1 text-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            3D Playground
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <span className="sr-only">Close scene list</span>
            <FiX />
          </button>
        </div>
        <nav aria-label="Scenes" className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
          {sections.map(([section, scenes]) => (
            <div key={section} className="mt-4">
              <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {section}
              </h2>
              <ul className="mt-1">
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
                          "block rounded-md px-2 py-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700",
                          isCurrent && "bg-gray-100 font-semibold dark:bg-gray-800",
                        )}
                      >
                        {turnKebabIntoTitleCase(scene.name)}
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

/**
 * Breadcrumb + scene list for the regular navbar on playground text pages.
 * The drawer is portaled out of the header: the header's backdrop-filter
 * would otherwise become the containing block of the fixed drawer. The
 * page itself lists every scene, so the client-only drawer costs no links.
 */
export function PlaygroundSecondaryNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <PlaygroundCrumb />
      {/* Phones get the scene grid on the page itself; keep the bar uncluttered. */}
      <span className="hidden sm:flex">
        <PlaygroundScenesButton open={open} onClick={() => setOpen((p) => !p)} className="ml-1" />
      </span>
      {mounted && createPortal(<PlaygroundDrawer open={open} onClose={close} />, document.body)}
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
