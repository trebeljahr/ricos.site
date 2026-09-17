import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EASTER_EGGS, EASTER_EGGS_CHANGED_EVENT, getFoundEggs } from "src/lib/easterEggs";

export default function EggsPage() {
  // null until mounted: finds live in this browser's storage, so the server cannot know them.
  const [found, setFound] = useState<Set<string> | null>(null);

  useEffect(() => {
    const update = () => setFound(new Set(getFoundEggs()));
    update();
    window.addEventListener(EASTER_EGGS_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EASTER_EGGS_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const count = found ? EASTER_EGGS.filter((egg) => found.has(egg.id)).length : 0;

  return (
    <Layout
      title="Easter eggs"
      description="A list of the hidden easter eggs on ricos.site and the ones you have found so far."
      url="/eggs"
      keywords={["easter eggs", "Rico Trebeljahr"]}
      noindex={true}
    >
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <Header
            breadcrumbs={{ path: "eggs" }}
            title="Easter eggs"
            subtitle={
              found
                ? `You found ${count} of ${EASTER_EGGS.length}.`
                : `There are ${EASTER_EGGS.length} hidden on this site.`
            }
          />
          <p>
            Small surprises are hidden across this site. Most of them react when you click an emoji
            a few times. This page remembers what you found in this browser only.
          </p>
          <ul className="not-prose m-0 mt-8 list-none p-0">
            {EASTER_EGGS.map((egg) => {
              const isFound = found?.has(egg.id) ?? false;
              return (
                <li
                  key={egg.id}
                  className="flex items-baseline gap-3 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-800"
                >
                  <span aria-hidden="true" className="w-6 shrink-0 text-center">
                    {isFound ? "🐣" : "🥚"}
                  </span>
                  {isFound ? (
                    <span className="font-semibold">{egg.name}</span>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      <span className="sr-only">Not found yet: </span>??? Somewhere on{" "}
                      <Link href={egg.where.href}>{egg.where.label}</Link>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      </main>
    </Layout>
  );
}
