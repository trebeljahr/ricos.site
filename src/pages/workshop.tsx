import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  formatEntryDate,
  parseWorkshopLog,
  WORKSHOP_LOG_FILE,
  type WorkshopEntry,
} from "src/lib/workshopLog";

// /workshop: Rico's public log of work in progress. Every word on it comes from
// his log file (see src/lib/workshopLog.ts); this page adds dates and layout
// only. It is development-only until that file says `published: true`.

type Props = {
  title: string;
  subtitle: string;
  description: string;
  entries: (WorkshopEntry & { label: string })[];
  /** Only under `next dev`: the log file is missing, or still unpublished. */
  devNote: "missing" | "unpublished" | null;
};

export default function WorkshopPage({ title, subtitle, description, entries, devNote }: Props) {
  return (
    <Layout title={title || "Workshop"} description={description} url="workshop" keywords={[]}>
      <PageMain>
        <Header
          breadcrumbs={{ path: "workshop" }}
          title={title || "Workshop"}
          subtitle={subtitle || undefined}
        />
        {devNote && (
          <p className="not-prose mb-group rounded-md border border-dashed border-gray-300 p-stack font-mono text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
            {devNote === "missing" ? "No file at " : "Development only: "}
            {WORKSHOP_LOG_FILE}
            {devNote === "unpublished" && " has no `published: true`"}
          </p>
        )}
        {/* The entries are the article: body prose gives them its rhythm. */}
        {entries.map((entry, index) => (
          <section
            key={`${entry.date}-${entry.title}`}
            id={entry.date}
            className="scroll-mt-24"
            aria-labelledby={`${entry.date}-heading`}
          >
            <h2 id={`${entry.date}-heading`} className={index === 0 ? "flush-top" : undefined}>
              <a href={`#${entry.date}`} className="no-underline hover:text-accent">
                <time dateTime={entry.date}>{entry.label}</time>
              </a>
              {entry.title && (
                <span className="mt-hair block text-[0.75em] font-normal text-gray-600 dark:text-gray-300">
                  {entry.title}
                </span>
              )}
            </h2>
            <Markdown remarkPlugins={[remarkGfm]}>{entry.markdown}</Markdown>
          </section>
        ))}
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const dev = process.env.NODE_ENV !== "production";

  let source: string | null = null;
  try {
    source = await readFile(resolve(process.cwd(), WORKSHOP_LOG_FILE), "utf8");
  } catch {
    source = null;
  }

  const log = source === null ? null : parseWorkshopLog(source);
  if (!dev && !log?.published) return { notFound: true } as const;

  const props: Props = {
    title: log?.title ?? "",
    subtitle: log?.subtitle ?? "",
    description: log?.subtitle ?? "",
    entries: (log?.entries ?? []).map((entry) => ({
      ...entry,
      label: formatEntryDate(entry.date),
    })),
    devNote: !log ? "missing" : log.published ? null : "unpublished",
  };
  return { props };
}
