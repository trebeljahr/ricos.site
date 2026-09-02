import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";
import type { Item } from "src/lib/themes/themeContent";

/** One row in a themed or tagged list: cover thumbnail, meta line, title, excerpt. */
export function ContentListRow({ item }: { item: Item }) {
  const meta: string[] = [];
  if (item.contentType) meta.push(item.contentType);
  if (item.readingTime) meta.push(`${item.readingTime} min`);
  if (item.date) meta.push(new Date(item.date).getFullYear().toString());

  return (
    <li className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      <Link
        href={item.link}
        className="group grid gap-4 py-4 no-underline text-inherit hover:text-myBlue sm:grid-cols-[5rem_1fr]"
      >
        <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
          {item.cover ? (
            <ImageWithLoader
              src={item.cover.src}
              alt={item.cover.alt}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {meta.join(" · ")}
          </div>
          <h4 className="m-0 text-base font-semibold text-gray-950 transition-colors group-hover:text-myBlue dark:text-white">
            {item.title}
          </h4>
          {item.excerpt && (
            <p className="m-0 mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
              {item.excerpt}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
