import { BreadCrumbs } from "@components/BreadCrumbs";
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
      <BreadCrumbs path={url} />
      <main>
        <article>
          <section className="Podcastnote-info">
            <div className="Podcastnote-preview-text">
              <h2 className="mt-0 pt-0">
                {podcastnote.show} | Episode – {podcastnote.episode}
              </h2>

              <h1 className="pt-4">{podcastnote.title}</h1>
              <p>
                <b>Rating: {podcastnote.rating}/10</b>
              </p>
              <p>
                Listen on:{" "}
                <ExternalLink href={podcastnote.links.youtube}>
                  Youtube
                </ExternalLink>{" "}
                |{" "}
                <ExternalLink href={podcastnote.links.spotify}>
                  Spotify
                </ExternalLink>{" "}
                | <ExternalLink href={podcastnote.links.web}>Web</ExternalLink>
              </p>
            </div>
          </section>
          <section>
            <MDXContent source={podcastnote.content} />
          </section>
        </article>
      </main>

      <footer>
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
