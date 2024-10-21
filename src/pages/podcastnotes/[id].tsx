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
  return <MDXContent code={podcastnote.content} />;
};

const Podcastnote = ({ podcastnote: Podcastnote }: Props) => {
  const url = `podcastnotes/${Podcastnote.slug}`;
  return (
    <Layout
      title={`${Podcastnote.displayTitle}`}
      description={`These are my Podcast Notes for ${Podcastnote.title}. ${Podcastnote.excerpt}`}
      url={url}
    >
      <BreadCrumbs path={url} />
      <main>
        <article>
          <section className="Podcastnote-info">
            <div className="Podcastnote-preview-text">
              <h2 className="mt-0 pt-0">
                {Podcastnote.show} | Episode – {Podcastnote.episode}
              </h2>

              <h1 className="pt-4">{Podcastnote.title}</h1>
              <p>
                <b>Rating: {Podcastnote.rating}/10</b>
              </p>
              <p>
                Listen on:{" "}
                <ExternalLink href={Podcastnote.links.youtube}>
                  Youtube
                </ExternalLink>{" "}
                |{" "}
                <ExternalLink href={Podcastnote.links.youtube}>
                  Spotify
                </ExternalLink>{" "}
                |{" "}
                <ExternalLink href={Podcastnote.links.youtube}>
                  Web
                </ExternalLink>
              </p>
            </div>
          </section>
          <section>
            <PodcastnoteComponent podcastnote={Podcastnote} />
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

export default Podcastnote;

type Params = {
  params: {
    id: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const Podcastnote = podcastnotes.find(({ slug }) => params.id === slug);

  return {
    props: {
      Podcastnote,
    },
  };
}

export async function getStaticPaths() {
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
