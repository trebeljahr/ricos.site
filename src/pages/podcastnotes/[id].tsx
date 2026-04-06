import { BreadCrumbs } from "@components/BreadCrumbs";
import { ExternalLink } from "@components/ExternalLink";
import { JsonLd, BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { Backlinks } from "@components/Backlinks";
import { ToTopButton } from "@components/ToTopButton";
import type { Podcastnote as PodcastnoteType } from "@velite";

import { byOnlyPublished } from "src/lib/utils/filters";

type BacklinkItem = { title: string; link: string; type: string };

type Props = {
  podcastnote: PodcastnoteType;
  backlinks: BacklinkItem[];
};

const PodcastnoteComponent = ({ podcastnote, backlinks }: Props) => {
  const url = `podcastnotes/${podcastnote.slug}`;
  return (
    <Layout
      title={podcastnote.seoTitle || podcastnote.displayTitle}
      description={podcastnote.metaDescription}
      url={url}
      keywords={podcastnote.seoKeywords.length > 0 ? podcastnote.seoKeywords : podcastnote.tags.split(",")}
      withProgressBar={true}
      image={podcastnote.cover.src}
      imageAlt={podcastnote.cover.alt}
      ogType="article"
      articlePublishedTime={podcastnote.date}
    >
      <JsonLd
        title={podcastnote.seoTitle || podcastnote.displayTitle}
        description={podcastnote.metaDescription}
        url={url}
        image={podcastnote.cover.src}
        imageAlt={podcastnote.cover.alt}
        datePublished={podcastnote.date}
        type="article"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Podcast Notes", url: "/podcastnotes" },
          { name: podcastnote.title, url: `/${url}` },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />
        <MetadataDisplay
          date={podcastnote.date}
          readingTime={podcastnote.metadata.readingTime}
        />

        <article>
          <section className="Podcastnote-info">
            <div className="Podcastnote-preview-text">
              <h1 className="mt-16! mb-2!">
                <p className="text-2xl font-normal">
                  {podcastnote.show} | Episode – {podcastnote.episode}{" "}
                </p>
                <p className="mt-2">{podcastnote.title}</p>
              </h1>
              {/* <p className="mt-10 mb-0"></p> */}
              <p className="mt-0 mb-0">
                <b>Rating: {podcastnote.rating}/10</b>
              </p>
              <span className="mt-2">
                Listen on:{" "}
                <ExternalLink href={podcastnote.links.youtube}>
                  Youtube
                </ExternalLink>{" "}
                |{" "}
                <ExternalLink href={podcastnote.links.spotify}>
                  Spotify
                </ExternalLink>{" "}
                | <ExternalLink href={podcastnote.links.web}>Web</ExternalLink>
              </span>
            </div>
          </section>
          <section>
            <MDXContent source={podcastnote.content} />
          </section>
        </article>

        <footer>
          <NewsletterForm />
          <Backlinks items={backlinks} />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};

export default PodcastnoteComponent;

type Params = {
  params: {
    id: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const podcastnotes: PodcastnoteType[] = loadVeliteData("podcastnotes.json");
  const podcastnote = podcastnotes
    .filter(byOnlyPublished)
    .find(({ slug }) => params.id === slug);

  const { getBacklinks } = await import("src/lib/utils/getBacklinks");
  const backlinks = getBacklinks(podcastnote.link);

  return {
    props: {
      podcastnote,
      backlinks,
    },
  };
}

export async function getStaticPaths(): Promise<{
  paths: Params[];
  fallback: boolean;
}> {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const podcastnotes: PodcastnoteType[] = loadVeliteData("podcastnotes.json");
  const paths = podcastnotes.filter(byOnlyPublished).map((podcastnote) => {
    return {
      params: {
        id: podcastnote.slug,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}
