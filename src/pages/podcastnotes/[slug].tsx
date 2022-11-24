import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Layout from "../../components/layout";
import { ToTopButton } from "../../components/ToTopButton";
import { ExternalLink } from "../../components/ExternalLink";
import { NewsletterForm } from "../../components/newsletter-signup";
import { PodcastNote, allPodcastNotes } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { MarkdownRenderers } from "src/components/CustomRenderers";

type Props = {
  podcastNote: PodcastNote;
};

const PodcastNoteComponent = ({ podcastNote }: Props) => {
  const Component = useMDXComponent(podcastNote.body.code);
  return <Component components={{ ...MarkdownRenderers }} />;
};

const PodcastNote = ({ podcastNote }: Props) => {
  const router = useRouter();
  if (!router.isFallback && !podcastNote?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <Layout
      title={`${podcastNote.displayTitle}`}
      description={`These are my Podcast Notes for ${podcastNote.title}. ${podcastNote.excerpt}`}
    >
      <article>
        <section className="podcastNote-info main-section main-text">
          <div className="podcastNote-preview-text">
            <h2>
              {podcastNote.show} | Episode – {podcastNote.episode}
            </h2>

            <h1>{podcastNote.title}</h1>
            <p>
              <b>Rating: {podcastNote.rating}/10</b>
            </p>
            <p>
              Listen on:{" "}
              <ExternalLink href={podcastNote.links.youtube}>
                Youtube
              </ExternalLink>{" "}
              |{" "}
              <ExternalLink href={podcastNote.links.youtube}>
                Spotify
              </ExternalLink>{" "}
              |{" "}
              <ExternalLink href={podcastNote.links.youtube}>Web</ExternalLink>
            </p>
          </div>
        </section>
        <section className="main-section main-text post-body">
          <PodcastNoteComponent podcastNote={podcastNote} />
        </section>
        <section className="main-section">
          <ToTopButton />
          <NewsletterForm />
        </section>
      </article>
    </Layout>
  );
};

export default PodcastNote;

type Params = {
  params: {
    slug: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const podcastNote = allPodcastNotes.find(({ slug }) => params.slug === slug);

  return {
    props: {
      podcastNote,
    },
  };
}

export async function getStaticPaths() {
  const paths = allPodcastNotes.map((podcastNote) => {
    return {
      params: {
        slug: podcastNote.slug,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}
