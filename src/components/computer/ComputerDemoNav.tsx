import Link from "next/link";

import { computerDemos, type ComputerDemoSlug } from "../../lib/computerDemos";

const linkClass =
  "inline-flex min-h-10 items-center rounded border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-cyan-500 hover:text-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:border-gray-700 dark:text-gray-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300";

export function ComputerDemoNav({ current, bottom = false }: { current: ComputerDemoSlug; bottom?: boolean }) {
  const index = computerDemos.findIndex((demo) => demo.slug === current);
  const previous = computerDemos[index - 1];
  const next = computerDemos[index + 1];

  return (
    <nav
      aria-label={bottom ? "Previous and next computer demos" : "Computer demo navigation"}
      className={bottom ? "mt-8 border-t border-gray-300 pt-5 dark:border-gray-700" : ""}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/computer" className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-300">
          All computer demos
        </Link>
        <div className="flex items-center gap-2">
          {previous ? (
            <Link href={`/computer/${previous.slug}`} className={linkClass} aria-label={`Previous demo: ${previous.title}`}>
              ← <span className="ml-1 max-w-[32vw] truncate">{bottom ? previous.title : "Previous"}</span>
            </Link>
          ) : (
            <span className={`${linkClass} cursor-default opacity-40`} aria-hidden="true">← <span className="ml-1 hidden sm:inline">Previous</span></span>
          )}
          <span className="min-w-12 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
            {index + 1} / {computerDemos.length}
          </span>
          {next ? (
            <Link href={`/computer/${next.slug}`} className={linkClass} aria-label={`Next demo: ${next.title}`}>
              <span className="mr-1 max-w-[32vw] truncate">{bottom ? next.title : "Next"}</span> →
            </Link>
          ) : (
            <span className={`${linkClass} cursor-default opacity-40`} aria-hidden="true"><span className="mr-1">Next</span> →</span>
          )}
        </div>
      </div>
    </nav>
  );
}
