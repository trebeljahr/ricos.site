import { CardGallery } from "@components/CardGalleries";
import { ExternalLink } from "@components/ExternalLink";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import Link from "next/link";
import { PROJECT_SECTIONS, projectsInSection } from "src/lib/projects";

const toAnchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ProjectsPage() {
  return (
    <Layout
      title="Projects"
      description="Games, tools and other things Rico Trebeljahr has built. Most of them run right in your browser."
      url="projects"
      image="/projects/collection-of-beauty.webp"
      imageAlt="Collage of classic paintings from Collection of Beauty"
      keywords={[
        "projects",
        "portfolio",
        "browser games",
        "open source",
        "developer tools",
        "creative coding",
        "Rico Trebeljahr",
      ]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Projects", url: "/projects" },
        ]}
      />
      <main className="py-20 px-3 max-w-(--breakpoint-lg) mx-auto">
        <h1 className="text-5xl mt-16!">Projects</h1>
        <p className="max-w-prose">
          Here are the things I have built over the years. Some are games, some are tools, and some
          are just nice to look at. Click on a card to try one out. If you want to see the code,
          most of it is on{" "}
          <ExternalLink href="https://github.com/trebeljahr" rel="noopener">
            GitHub
          </ExternalLink>
          .
        </p>
        <p className="max-w-prose">
          A few of these, like Fractal Garden and the Quaternius page, started as{" "}
          <Link href="/1-month-projects">1-month projects</Link>. I also run a small software studio
          called{" "}
          <ExternalLink href="https://ricoslabs.com" rel="noopener">
            Ricos Labs
          </ExternalLink>
          .
        </p>
        <p className="max-w-prose mb-14">
          Wanna know what I still want to learn as a programmer? I have an{" "}
          <Link href="/achievements">/achievements</Link> page.
        </p>

        {PROJECT_SECTIONS.map(({ title, intro }) => (
          <section key={title} id={toAnchor(title)} className="mb-16">
            <h2 className="text-3xl">{title}</h2>
            <p className="max-w-prose mb-8">{intro}</p>
            <CardGallery content={projectsInSection(title)} withSubtitle />
          </section>
        ))}
      </main>
    </Layout>
  );
}
