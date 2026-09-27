import { navGroups } from "@components/Navbar/navItems";
import Link from "next/link";
import { useEffect, useState } from "react";

type Page = { link: string; title: string };

/** How far a typed address may stand from a real one and still be taken for
    it: a third of its length, and never more than five edits. Past that the
    reader did not mistype this page, they went somewhere else entirely. */
const nearEnough = (path: string) => Math.min(5, Math.max(2, Math.round(path.length / 3)));

/** Edits to turn one into the other. Bails out as soon as it is past caring,
    which is most of the time: one address rarely resembles another. */
function distance(from: string, to: string, ceiling: number) {
  if (Math.abs(from.length - to.length) > ceiling) return ceiling + 1;
  let row = Array.from({ length: to.length + 1 }, (_, i) => i);
  for (let i = 1; i <= from.length; i++) {
    const next = [i];
    let best = i;
    for (let j = 1; j <= to.length; j++) {
      const cost = from[i - 1] === to[j - 1] ? 0 : 1;
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + cost);
      best = Math.min(best, next[j]);
    }
    if (best > ceiling) return ceiling + 1;
    row = next;
  }
  return row[to.length];
}

const tidy = (path: string) => decodeURIComponent(path).toLowerCase().replace(/\/+$/, "") || "/";

/**
 * The nearest real page to the address that was actually typed, when there is
 * one close enough to be a slip of the fingers. The pages come from the site's
 * own search index, which is every page it has, and from the navigation, which
 * covers the few sections the index does not list.
 */
export const DidYouMean = () => {
  const [guess, setGuess] = useState<Page | null>(null);

  useEffect(() => {
    let dropped = false;
    const asked = tidy(window.location.pathname);
    if (asked === "/" || asked === "/404") return;

    const pick = (pages: Page[]) => {
      const ceiling = nearEnough(asked);
      let best: Page | null = null;
      let closest = ceiling + 1;
      for (const page of pages) {
        const apart = distance(asked, tidy(page.link), closest - 1);
        if (apart >= closest) continue;
        closest = apart;
        best = page;
      }
      // Nothing is nearer than a page that is not there at all.
      if (best && closest > 0) setGuess(best);
    };

    const fromMenu: Page[] = navGroups.flatMap((group) =>
      group.items.map((item) => ({ link: item.href, title: item.label })),
    );

    fetch("/search-index.json")
      .then((answer) => (answer.ok ? answer.json() : []))
      .then((pages: Page[]) => {
        if (!dropped) pick([...fromMenu, ...pages]);
      })
      .catch(() => {
        if (!dropped) pick(fromMenu);
      });

    return () => {
      dropped = true;
    };
  }, []);

  if (!guess) return null;

  return (
    <p>
      Did you mean{" "}
      <Link href={guess.link} className="font-mono">
        {guess.link}
      </Link>
      ?
    </p>
  );
};
