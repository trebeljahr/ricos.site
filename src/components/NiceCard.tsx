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
    <div
      key={slug}
      className="overflow-hidden lg:grid mb-8 md:mb-20"
      style={{
        gridTemplateColumns: "17rem auto",
        gridColumnGap: "2rem",
      }}
    >
      <div className="lg:h-full h-56 mb-4 relative">
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
      <div>
        <Link href={slug}>
          <h2 className="pt-0">{title}</h2>
        </Link>

        <p>{excerpt}</p>
      </div>
    </div>
  );
};
