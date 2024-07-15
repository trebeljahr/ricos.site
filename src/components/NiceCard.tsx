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

export const NiceCard = ({
  cover,
  priority = false,
  slug,
  title,
  excerpt,
  bigImage = false,
}: NiceCardProps) => {
  return (
    <Link href={slug} className="not-prose block card-hover mb-12 lg:mb-12">
      <div
        key={slug}
        className="overflow-hidden md:grid"
        style={{
          gridTemplateColumns: "15rem auto",
        }}
      >
        <div className="h-64 md:h-full mb-4 relative">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
              priority ? 780 : 357
            }`}
            priority={priority}
            className="rounded-md"
            style={{
              objectFit: "cover",
            }}
          />
        </div>
        <div className="m-5">
          <h2 className="pt-0">{title}</h2>
          <p className="text-grey">{excerpt}</p>
        </div>
      </div>
    </Link>
  );
};
