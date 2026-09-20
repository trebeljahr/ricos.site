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
                    <Link href={item.link} className="text-accent hover:underline">
                      {item.title}
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
