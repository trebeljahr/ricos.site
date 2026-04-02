import Link from "next/link";

type RelatedItem = {
  title: string;
  link: string;
  excerpt?: string;
};

export const RelatedContent = ({
  items,
  heading = "You might also like",
}: {
  items: RelatedItem[];
  heading?: string;
}) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2>{heading}</h2>
      <ul className="space-y-4 list-none pl-0!">
        {items.map((item) => (
          <li key={item.link} className="pl-0!">
            <Link
              href={item.link}
              className="text-myBlue hover:underline font-medium"
            >
              {item.title}
            </Link>
            {item.excerpt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0!">
                {item.excerpt}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
