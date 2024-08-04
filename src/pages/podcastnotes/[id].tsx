import {
  allPodcastnotes,
  type Podcastnote as PodcastnoteType,
} from "@contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { BreadCrumbs } from "@components/BreadCrumbs";
import { MarkdownRenderers } from "@components/CustomRenderers";
import { ExternalLink } from "@components/ExternalLink";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";

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
            <PodcastnoteComponent Podcastnote={Podcastnote} />
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
