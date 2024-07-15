import { allNotes, type Note } from "@contentlayer/generated";
import { BreadCrumbs } from "@components/BreadCrumbs";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import PostHeader from "@components/PostHeader";
import { MarkdownRenderers } from "@components/CustomRenderers";
import { useMDXComponent } from "next-contentlayer/hooks";

type Props = {
  children: React.ReactNode;
  post: Note;
};

export const NotesLayout = ({
  children,
  post: { excerpt, slug, cover, title, date },
}: Props) => {
  const url = `notes/${slug}`;
  return (
    <Layout
      description={excerpt || ""}
      title={title}
      image={cover?.src || ""}
      url={url}
      imageAlt={cover?.alt || ""}
    >
      <article className="main-content prose post-body">
        <section>
          <BreadCrumbs path={url} />

          <PostHeader title={title || ""} date={date} />
          {children}
        </section>
        <section>
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
  const Component = useMDXComponent(post.body.code);

  return (
    <NotesLayout post={post}>
      <Component components={{ ...MarkdownRenderers }} />
    </NotesLayout>
  );
}

export async function getStaticPaths() {
  const paths = allNotes
    .filter(({ published }) => published)
    .map(({ slug }) => ({ params: { id: slug } }));

  return {
    paths,
    fallback: false,
  };
}

function replaceUndefinedWithNull(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      obj[key] = replaceUndefinedWithNull(obj[key]);
    }
  }

  return obj;
}

type Params = { params: { id: string } };

export async function getStaticProps({ params }: Params) {
  const note = allNotes
    .filter(({ published }) => published)
    .find((post: Note) => post.slug === params.id);

  return {
    props: { post: replaceUndefinedWithNull(note) },
  };
}
