import { BreadCrumbs } from "@components/BreadCrumbs";
import { MetadataDisplay } from "@components/DateFormatter";
import { ExternalLink } from "@components/ExternalLink";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { podcastnotes, type Podcastnote as PodcastnoteType } from "@velite";

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
      withProgressBar={true}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={url} />
        <MetadataDisplay
          date={podcastnote.date}
          readingTime={podcastnote.metadata.readingTime}
        />

        <article>
          <section className="Podcastnote-info">
            <div className="Podcastnote-preview-text">
              <h1 className="mt-16 mb-2">
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
      </main>

      <footer className="mb-20 px-3">
        <ToTopButton />
        <NewsletterForm />
      </footer>
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
  const podcastnote = podcastnotes.find(({ slug }) => params.id === slug);

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
  const paths = podcastnotes.map((podcastnote) => {
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
