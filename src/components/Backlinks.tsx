import Link from "next/link";

type BacklinkItem = {
  title: string;
  link: string;
  type: string;
};

const TYPE_LABELS: Record<string, string> = {
  Post: "Posts",
  Booknote: "Book Notes",
  Newsletter: "Newsletters",
  Travelblog: "Travel Stories",
  Podcastnote: "Podcast Notes",
  Page: "Pages",
};

const TYPE_ORDER = ["Post", "Booknote", "Newsletter", "Podcastnote", "Travelblog", "Page"];

// Rows, not <Card>s: a backlink carries only a title, a link and a type, so
// there is no cover to build a card around, and a page can collect a dozen
// of them, which as cards would outweigh the article they sit under. They
// borrow the card's hover language instead.
export const Backlinks = ({ items }: { items: BacklinkItem[] }) => {
  if (items.length === 0) return null;

  const grouped = new Map<string, BacklinkItem[]>();
  for (const item of items) {
    const existing = grouped.get(item.type) || [];
    existing.push(item);
    grouped.set(item.type, existing);
  }

  const sortedTypes = TYPE_ORDER.filter((t) => grouped.has(t));

  return (
    <div className="mt-sub">
      <h2>Links to this page</h2>
      {/* A link index, not prose: `not-prose` drops the typography plugin's
          list and paragraph margins so the spacing tokens below hold without
          `!important`. */}
      <div className="not-prose space-y-stack">
        {sortedTypes.map((type) => {
          const typeItems = grouped.get(type)!;
          const label = TYPE_LABELS[type] || type;
          return (
            <div key={type}>
              <p className="mb-hair text-sm font-medium text-gray-400 dark:text-gray-500">
                {label}
              </p>
              <ul className="list-none space-y-hair pl-0">
                {typeItems.map((item) => (
                  <li key={item.link} className="pl-0">
                    <Link
                      href={item.link}
                      // The row is the target, not the words: it spans the
                      // column, takes the accent as one piece, and pulls its
                      // padding back out with -mx so the titles stay on the
                      // article's left edge.
                      className="group -mx-tight flex items-baseline gap-hair rounded-md px-tight py-hair text-gray-700 no-underline hover:bg-gray-100 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myBlue motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {/* Holds its width while hidden, so the title does not
                          shift sideways under the cursor. */}
                      <span
                        aria-hidden
                        className="w-4 shrink-0 text-sm text-accent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:-translate-x-1 motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:translate-x-0 motion-safe:group-focus-visible:translate-x-0"
                      >
                        →
                      </span>
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
