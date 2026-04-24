import { BreadCrumbs } from "@components/BreadCrumbs";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MarkdownRenderers } from "@components/MarkdownRenderers";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { getMDXComponent } from "mdx-bundler/client";
import { useMemo, useState } from "react";

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  value: string;
};

type NowEntry = {
  date: string;
  content: { code: string; frontmatter: Record<string, unknown> };
  diff: DiffLine[] | null; // null for the oldest entry
};

type Props = {
  entries: NowEntry[];
};

const NowMDX = ({ code, frontmatter }: { code: string; frontmatter: Record<string, unknown> }) => {
  const Component = useMemo(
    () => getMDXComponent(code, { ...frontmatter, frontmatter }),
    [code, frontmatter],
  );
  return <Component components={MarkdownRenderers} />;
};

const DiffView = ({ diff }: { diff: DiffLine[] }) => {
  return (
    <div className="font-mono text-sm leading-relaxed border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {diff.map((line, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
          key={i}
          className={
            line.type === "added"
              ? "bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300"
              : line.type === "removed"
                ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400"
          }
        >
          <span className="inline-block w-6 text-center select-none opacity-50">
            {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
          </span>
          <span className="whitespace-pre-wrap">{line.value || "\u00A0"}</span>
        </div>
      ))}
    </div>
  );
};

export default function NowHistory({ entries }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
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
          <div className="text-gray-600 dark:text-gray-400 mb-8">
            Past editions of my{" "}
            <a href="/now" className="text-myBlue hover:underline">
              /now
            </a>{" "}
            page, showing what I was focused on at different points in time.
            {entries.length > 0 &&
              ` ${entries.length} snapshots from ${entries[entries.length - 1]?.date} to ${entries[0]?.date}.`}
          </div>

          {entries.length > 0 && (
            <>
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

              <div className="flex flex-wrap gap-2 mb-8">
                {entries.map((entry, i) => (
                  <button
                    key={entry.date}
                    onClick={() => setSelectedIndex(i)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors cursor-pointer ${
                      i === selectedIndex
                        ? "bg-myBlue text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {entry.date}
                  </button>
                ))}
              </div>

              <div className="border-l-4 border-myBlue pl-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Snapshot from{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {selected.date}
                    </span>
                  </div>
                  {selected.diff && (
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors cursor-pointer ${
                        showDiff
                          ? "bg-myBlue text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {showDiff ? "Show content" : "Show changes"}
                    </button>
                  )}
                </div>

                {showDiff && selected.diff ? (
                  <DiffView diff={selected.diff} />
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <NowMDX
                      code={selected.content.code}
                      frontmatter={selected.content.frontmatter}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {entries.length === 0 && (
            <div className="text-gray-500">No history available yet. Check back later!</div>
          )}
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const { bundleMDX } = await import("mdx-bundler");
  const { diffLines } = await import("diff");

  const HISTORY_DIR = resolve("src/content/now-history");

  const files = readdirSync(HISTORY_DIR)
    .filter((f: string) => f.endsWith(".md"))
    .sort()
    .reverse(); // newest first

  const entries: NowEntry[] = [];

  for (const file of files) {
    const rawContent = readFileSync(resolve(HISTORY_DIR, file), "utf-8");
    const date = file.replace(".md", "");

    try {
      const result = await bundleMDX({ source: rawContent });
      new Function(result.code); // validate
      entries.push({
        date,
        content: { code: result.code, frontmatter: result.frontmatter },
        diff: null, // computed below
      });
    } catch (e) {
      console.error(`Failed to bundle ${file}:`, (e as Error).message?.slice(0, 200));
    }
  }

  // Compute diffs between consecutive versions (newest to oldest)
  for (let i = 0; i < entries.length - 1; i++) {
    const currentRaw = readFileSync(resolve(HISTORY_DIR, `${entries[i].date}.md`), "utf-8");
    const previousRaw = readFileSync(resolve(HISTORY_DIR, `${entries[i + 1].date}.md`), "utf-8");

    const changes = diffLines(previousRaw, currentRaw);
    const diffResult: DiffLine[] = [];

    for (const change of changes) {
      const lines = change.value.split("\n");
      // diffLines includes a trailing empty string from the final newline
      if (lines[lines.length - 1] === "") lines.pop();

      for (const line of lines) {
        if (change.added) {
          diffResult.push({ type: "added", value: line });
        } else if (change.removed) {
          diffResult.push({ type: "removed", value: line });
        } else {
          diffResult.push({ type: "unchanged", value: line });
        }
      }
    }

    entries[i].diff = diffResult;
  }

  return { props: { entries } };
}
