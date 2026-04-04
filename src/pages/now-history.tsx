import { BreadCrumbs } from "@components/BreadCrumbs";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MarkdownRenderers } from "@components/MarkdownRenderers";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { getMDXComponent } from "mdx-bundler/client";
import { useMemo, useState } from "react";

type NowEntry = {
  date: string;
  commitHash: string;
  content: { code: string; frontmatter: Record<string, unknown> } | null;
  rawContent: string;
};

type Props = {
  entries: NowEntry[];
};

const NowMDX = ({ code, frontmatter }: { code: string; frontmatter: Record<string, unknown> }) => {
  const result = useMemo(() => {
    try {
      return { Component: getMDXComponent(code, { ...frontmatter, frontmatter }), error: null };
    } catch {
      return { Component: null, error: "Failed to render this snapshot" };
    }
  }, [code, frontmatter]);

  if (result.error || !result.Component) {
    return <p className="text-gray-500 italic">{result.error}</p>;
  }
  return <result.Component components={MarkdownRenderers} />;
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

              <div className="border-l-4 border-myBlue pl-6 mb-8">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Snapshot from{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {selected.date}
                  </span>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  {selected.content ? (
                    <NowMDX code={selected.content.code} frontmatter={selected.content.frontmatter} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                      {selected.rawContent}
                    </pre>
                  )}
                </div>
              </div>
            </>
          )}

          {entries.length === 0 && (
            <div className="text-gray-500">
              No history available yet. Check back later!
            </div>
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

  const entries: NowEntry[] = [];
  let prevContent = "";

  for (const commit of commits) {
    try {
      const rawContent = execSync(
        `cd "${NOTES_DIR}" && git show "${commit.hash}:${NOW_FILE}" 2>/dev/null`,
        { encoding: "utf-8" }
      );

      const stripped = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
      if (stripped.length < 50) continue;
      if (stripped === prevContent) continue;
      prevContent = stripped;

      let content: { code: string; frontmatter: Record<string, unknown> } | null = null;
      try {
        const result = await bundleMDX({ source: rawContent });
        // Validate that the bundled code can actually be evaluated —
        // some historical commits produce code that fails at runtime
        new Function(result.code);
        content = { code: result.code, frontmatter: result.frontmatter };
      } catch (e) {
        console.error(`Failed to bundle MDX for ${commit.hash.slice(0, 8)} (${commit.date}):`, (e as Error).message?.slice(0, 200));
      }

      entries.push({
        date: commit.date.split(" ")[0],
        commitHash: commit.hash.slice(0, 8),
        content,
        rawContent: stripped,
      });
    } catch {
      continue;
    }
  }

  return { props: { entries } };
}
