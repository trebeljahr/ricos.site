import { AnnounceSignup } from "@components/AnnounceSignup";
import { CardGallery } from "@components/CardGalleries";
import { ExternalLink } from "@components/ExternalLink";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import Head from "next/head";
import Link from "next/link";
import { ANNOUNCEMENTS_FEED_PATH } from "src/lib/announcements";
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
      <Head>
        <link
          rel="alternate"
          type="application/rss+xml"
          href={ANNOUNCEMENTS_FEED_PATH}
          title="New things from Rico"
        />
      </Head>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Projects", url: "/projects" },
        ]}
      />
      <PageMain>
        <Header breadcrumbs={{ path: "/projects" }} title="Projects" />
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
          <Link href="/1-month-projects">1-month projects</Link>.{" "}
          <ExternalLink href="https://ricoslabs.com" rel="noopener">
            Ricos Labs
          </ExternalLink>{" "}
          is my studio. It is where I make games, and the umbrella for the rest of my software work.
        </p>
        <p className="max-w-prose mb-section">
          Wanna know what I still want to learn as a programmer? I have an{" "}
          <Link href="/achievements">/achievements</Link> page.
        </p>

        {PROJECT_SECTIONS.map(({ title, intro }) => (
          <section key={title} id={toAnchor(title)} className="mb-section">
            <h2 className="text-3xl">{title}</h2>
            <p className="max-w-prose mb-group">{intro}</p>
            <CardGallery content={projectsInSection(title)} withSubtitle coverAspect="video" />
          </section>
        ))}

        <section id="new-things" className="mb-section flow-stack">
          <AnnounceSignup />
          <p className="max-w-prose text-sm">
            Feed readers: <a href={ANNOUNCEMENTS_FEED_PATH}>RSS feed of new things</a>.
          </p>
        </section>
      </PageMain>
    </Layout>
  );
}
