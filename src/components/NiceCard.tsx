import Image from "next/image";
import Link from "next/link";

type NiceCardProps = {
  cover: { src: string; alt: string };
  slug: string;
  title: string;
  excerpt: string;
  priority?: boolean;
};

export const NiceCard = ({
  cover,
  priority = false,
  slug,
  title,
  excerpt,
}: NiceCardProps) => {
  return (
    <Link href={slug} className="card-hover mb-12 lg:mb-12">
      <div
        key={slug}
        className="overflow-hidden lg:grid"
        style={{
          gridTemplateColumns: "15rem auto",
          gridColumnGap: "2rem",
        }}
      >
        <div className="h-64 md:h-56 lg:h-full mb-4 relative">
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
        <div className="pt-4 pr-4">
          <h2 className="text-black pt-0">{title}</h2>

          <p className="text-grey">{excerpt}</p>
        </div>
      </div>
    </Link>
  );
};
