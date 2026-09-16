import clsx from "clsx";
import Link from "next/link";
import type { Project } from "src/lib/projects";
import { ImageWithLoader } from "./ImageWithLoader";

const FALLBACK_GRADIENTS = [
  "from-indigo-500 to-sky-400",
  "from-rose-500 to-orange-400",
  "from-emerald-500 to-teal-400",
  "from-violet-500 to-fuchsia-400",
  "from-slate-600 to-slate-400",
];

const gradientFor = (slug: string) => {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
};

// Stretched-link card: the title link covers the whole card via ::after, so the
// optional "Code" link can sit on top of it without nesting anchors.
const titleLinkClasses =
  "no-underline text-inherit after:absolute after:inset-0 after:content-[''] focus-visible:outline-none";

export const ProjectCard = ({ project, headingLevel = "h3" }: ProjectCardProps) => {
  const { slug, title, tagline, href, external, sourceUrl, image } = project;
  const Heading = headingLevel;

  return (
    <article
      className={clsx(
        "group relative flex flex-col rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700",
        "hover:border-myBlue focus-within:border-myBlue transition-colors",
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        {image ? (
          <ImageWithLoader
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 336px"
            className="absolute inset-0 object-cover w-full h-full group-hover:scale-105 transform transition-transform duration-300"
          />
        ) : (
          <div
            aria-hidden="true"
            className={clsx(
              "absolute inset-0 flex items-center justify-center p-4 bg-linear-to-br",
              gradientFor(slug),
            )}
          >
            <span className="text-2xl font-bold text-white text-center drop-shadow">{title}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col grow p-3">
        <div>
          <Heading className="text-base font-semibold m-0!">
            {external ? (
              <a href={href} target="_blank" rel="noopener" className={titleLinkClasses}>
                {title}
              </a>
            ) : (
              <Link href={href} className={titleLinkClasses}>
                {title}
              </Link>
            )}
          </Heading>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1! mb-0! grow">{tagline}</p>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener"
            className="relative z-10 self-start mt-2 text-sm text-myBlue hover:underline"
          >
            Code
          </a>
        )}
      </div>
    </article>
  );
};

type ProjectCardProps = {
  project: Project;
  headingLevel?: "h2" | "h3";
};
