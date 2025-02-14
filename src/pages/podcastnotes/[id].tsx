import { BreadCrumbs } from "@components/BreadCrumbs";
import { ExternalLink } from "@components/ExternalLink";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { podcastnotes, type Podcastnote as PodcastnoteType } from "@velite";
import { byOnlyPublished } from "src/lib/utils";

type Props = {
  podcastnote: PodcastnoteType;
};

const PodcastnoteComponent = ({ podcastnote }: Props) => {
  const url = `podcastnotes/${podcastnote.slug}`;
  return (
    <Layout
      title={`${podcastnote.displayTitle}`}
      description={`These are my Podcast Notes for ${podcastnote.title}. ${podcastnote.excerpt}`}
      url={url}
      keywords={podcastnote.tags.split(",")}
      withProgressBar={true}
      image={podcastnote.cover.src}
      imageAlt={podcastnote.cover.alt}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />
        <MetadataDisplay
          date={podcastnote.date}
          readingTime={podcastnote.metadata.readingTime}
        />

        <article>
          <section className="Podcastnote-info">
            <div className="Podcastnote-preview-text">
              <h1>
                <p className="text-2xl font-normal">
                  {podcastnote.show} | Episode – {podcastnote.episode}{" "}
                </p>
                <p>{podcastnote.title}</p>
              </h1>
              <p>
                <b>Rating: {podcastnote.rating}/10</b>
              </p>
              <span>
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
          <ToTopButton />
          <NewsletterForm />
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
  const podcastnote = podcastnotes
    .filter(byOnlyPublished)
    .find(({ slug }) => params.id === slug);

  return {
    props: {
      podcastnote,
    },
  };
}

export async function getStaticPaths(): Promise<{
  paths: Params[];
  fallback: boolean;
}> {
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
