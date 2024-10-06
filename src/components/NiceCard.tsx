import Image from "next/image";
import Link from "next/link";

type NiceCardProps = {
  cover: { src: string; alt: string };
  slug: string;
  title: string;
  excerpt: string;
  priority?: boolean;
  bigImage?: boolean;
};

export function NiceCard({
  cover,
  priority = false,
  slug,
  title,
  excerpt,
  bigImage = false,
}: NiceCardProps) {
  return (
    <Link
      href={slug}
      className="bg-white dark:bg-gray-800 block overflow-hidden mb-12 lg:mb-12 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] shadow-lg rounded-lg"
    >
      <div
        key={slug}
        className="md:grid "
        style={{
          gridTemplateColumns: "15rem auto",
        }}
      >
        <div className="h-64 md:h-full relative not-prose">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
              priority ? "780px" : "357px"
            }`}
            priority={priority}
            className="object-cover"
          />
        </div>
        <div className="p-5 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300">
          <h2 className="pt-0 font-bold leading-snug">{title}</h2>
          <p>{excerpt}</p>
        </div>
      </div>
    </Link>
  );
}
