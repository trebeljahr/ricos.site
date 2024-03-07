import { allNotes, type Note } from "@contentlayer/generated";
import { BreadCrumbs } from "src/components/BreadCrumbs";
import { ToTopButton } from "../../components/ToTopButton";
import Layout from "../../components/layout";
import { NewsletterForm } from "../../components/newsletter-signup";
import PostHeader from "../../components/post-header";

type Props = {
  children: React.ReactNode;
  post: Note;
};

export const NotesLayout = ({
  children,
  post: { excerpt, slug, ogImage: cover, title, subtitle, date, author },
}: Props) => {
  const url = `notes/${slug}`;
  return (
    <Layout
      description={excerpt || ""}
      title={title + " – " + subtitle}
      image={cover?.src || ""}
      url={url}
      imageAlt={cover?.alt || ""}
    >
      <article>
        <section className="main-section main-text post-body">
          <BreadCrumbs path={url} />

          <PostHeader
            subtitle={subtitle}
            title={title || ""}
            date={date}
            author={author}
          />
          {children}
        </section>
        <section>
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};
type BlogProps = {
  post: Note;
  morePosts: Note[];
};

export default function PostComponent({ post }: BlogProps) {
  return (
    <NotesLayout post={post}>
      <div dangerouslySetInnerHTML={{ __html: post.body.html }} />
    </NotesLayout>
  );
}

export async function getStaticPaths() {
  console.log(allNotes.map(({ slug }) => ({ params: { id: slug } })));

  return {
    paths: allNotes.map(({ slug }) => ({ params: { id: slug } })),
    fallback: false,
  };
}

type Params = { params: { id: string } };

export async function getStaticProps({ params }: Params) {
  return {
    props: { post: allNotes.find((post: Note) => post.slug === params.id) },
  };
}
