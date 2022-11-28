import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Layout from "../../components/layout";
import { ToTopButton } from "../../components/ToTopButton";
import { ExternalLink } from "../../components/ExternalLink";
import { NewsletterForm } from "../../components/newsletter-signup";
import { Podcastnote, allPodcastnotes } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { MarkdownRenderers } from "src/components/CustomRenderers";

type Props = {
  Podcastnote: Podcastnote;
};

const PodcastnoteComponent = ({ Podcastnote }: Props) => {
  const Component = useMDXComponent(Podcastnote.body.code);
  return <Component components={{ ...MarkdownRenderers }} />;
};

const Podcastnote = ({ Podcastnote }: Props) => {
  return (
    <Layout
      title={`${Podcastnote.displayTitle}`}
      description={`These are my Podcast Notes for ${Podcastnote.title}. ${Podcastnote.excerpt}`}
    >
      <article>
        <section className="Podcastnote-info main-section main-text">
          <div className="Podcastnote-preview-text">
            <h2>
              {Podcastnote.show} | Episode – {Podcastnote.episode}
            </h2>

            <h1>{Podcastnote.title}</h1>
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
              <ExternalLink href={Podcastnote.links.youtube}>Web</ExternalLink>
            </p>
          </div>
        </section>
        <section className="main-section main-text post-body">
          <PodcastnoteComponent Podcastnote={Podcastnote} />
        </section>
        <section className="main-section">
          <ToTopButton />
          <NewsletterForm />
        </section>
      </article>
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
  const Podcastnote = allPodcastnotes.find(({ id }) => params.id === id);

  return {
    props: {
      Podcastnote,
    },
  };
}

export async function getStaticPaths() {
  const paths = allPodcastnotes.map((Podcastnote) => {
    return {
      params: {
        id: Podcastnote.id,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}
