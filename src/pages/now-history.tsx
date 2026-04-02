import { BreadCrumbs } from "@components/BreadCrumbs";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { useState } from "react";

type NowEntry = {
  date: string;
  commitHash: string;
  content: string;
};

type Props = {
  entries: NowEntry[];
};

export default function NowHistory({ entries }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = entries[selectedIndex];

  return (
    <Layout
      title="Now Page History – What I Used to Be Doing"
      description="A timeline of past editions of my /now page, showing what I was focused on at different points in time."
      url="now-history"
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      imageAlt="a person reading a book while floating in space"
      keywords={["now page", "history", "timeline", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Now", url: "/now" },
          { name: "History", url: "/now-history" },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <BreadCrumbs path="now-history" />
          <h1 className="text-4xl mt-16!">Now Page History</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Past editions of my{" "}
            <a href="/now" className="text-myBlue hover:underline">
              /now
            </a>{" "}
            page, showing what I was focused on at different points in time.
            {entries.length > 0 &&
              ` ${entries.length} snapshots from ${entries[entries.length - 1]?.date} to ${entries[0]?.date}.`}
          </p>

          {entries.length > 0 && (
            <>
              {/* Timeline scrubber */}
              <div className="mb-10">
                <label
                  htmlFor="now-slider"
                  className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2"
                >
                  Scrub through time:
                </label>
                <input
                  id="now-slider"
                  type="range"
                  min={0}
                  max={entries.length - 1}
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                  className="w-full accent-myBlue"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{entries[0]?.date} (latest)</span>
                  <span>{entries[entries.length - 1]?.date} (oldest)</span>
                </div>
              </div>

              {/* Date pills */}
              <div className="flex flex-wrap gap-2 mb-8">
                {entries.map((entry, i) => (
                  <button
                    key={entry.commitHash}
                    onClick={() => setSelectedIndex(i)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      i === selectedIndex
                        ? "bg-myBlue text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {entry.date}
                  </button>
                ))}
              </div>

              {/* Selected entry */}
              <div className="border-l-4 border-myBlue pl-6 mb-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Snapshot from{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {selected.date}
                  </span>
                </p>
                <div className="prose dark:prose-invert max-w-none">
                  <MDXContent source={selected.content} />
                </div>
              </div>
            </>
          )}

          {entries.length === 0 && (
            <p className="text-gray-500">
              No history available yet. Check back later!
            </p>
          )}
        </article>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { execSync } = await import("child_process");
  const { resolve } = await import("path");
  const { bundleMDX } = await import("mdx-bundler");

  const NOTES_DIR = resolve("src/content/Notes");
  const NOW_FILE = "pages/now.md";

  let logOutput = "";
  try {
    logOutput = execSync(
      `cd "${NOTES_DIR}" && git log --format="%H|%ai|%s" --follow "${NOW_FILE}" 2>/dev/null`,
      { encoding: "utf-8" }
    ).trim();
  } catch {
    return { props: { entries: [] } };
  }

  if (!logOutput) return { props: { entries: [] } };

  const commits = logOutput.split("\n").map((line) => {
    const [hash, date, ...messageParts] = line.split("|");
    return { hash, date: date.trim(), message: messageParts.join("|").trim() };
  });

  type Entry = {
    date: string;
    commitHash: string;
    content: { code: string };
  };

  const entries: Entry[] = [];

  for (const commit of commits) {
    try {
      const rawContent = execSync(
        `cd "${NOTES_DIR}" && git show "${commit.hash}:${NOW_FILE}" 2>/dev/null`,
        { encoding: "utf-8" }
      );

      // Strip frontmatter
      const stripped = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
      if (stripped.length < 50) continue;

      // Check for duplicate content
      if (entries.length > 0) {
        // Simple dedup by checking if content is identical
        const prevRaw = execSync(
          `cd "${NOTES_DIR}" && git show "${commits[commits.indexOf(commit) - 1]?.hash || ""}:${NOW_FILE}" 2>/dev/null`,
          { encoding: "utf-8" }
        )
          .replace(/^---[\s\S]*?---\n*/, "")
          .trim();
        if (stripped === prevRaw) continue;
      }

      // Bundle MDX
      const { code } = await bundleMDX({
        source: stripped,
      });

      entries.push({
        date: commit.date.split(" ")[0],
        commitHash: commit.hash.slice(0, 8),
        content: { code },
      });
    } catch {
      continue;
    }
  }

  return { props: { entries } };
}
