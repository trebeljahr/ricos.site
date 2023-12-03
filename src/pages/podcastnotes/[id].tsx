import {
  allPodcastnotes,
  type Podcastnote as PodcastnoteType,
} from "@contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { BreadCrumbs } from "src/components/BreadCrumbs";
import { MarkdownRenderers } from "src/components/CustomRenderers";
import { ExternalLink } from "../../components/ExternalLink";
import { ToTopButton } from "../../components/ToTopButton";
import Layout from "../../components/layout";
import { NewsletterForm } from "../../components/newsletter-signup";

type Props = {
  Podcastnote: PodcastnoteType;
};

const PodcastnoteComponent = ({ Podcastnote }: Props) => {
  const Component = useMDXComponent(Podcastnote.body.code);
  return <Component components={{ ...MarkdownRenderers }} />;
};

const Podcastnote = ({ Podcastnote }: Props) => {
  const url = `podcastnotes/${Podcastnote.id}`;
  return (
    <Layout
      title={`${Podcastnote.displayTitle}`}
      description={`These are my Podcast Notes for ${Podcastnote.title}. ${Podcastnote.excerpt}`}
      url={url}
    >
      <article>
        <section className="Podcastnote-info main-section main-text">
          <BreadCrumbs path={url} />
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
