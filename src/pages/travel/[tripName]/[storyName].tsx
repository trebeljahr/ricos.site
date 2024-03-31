import { BreadCrumbs } from "@components/BreadCrumbs";
import { MarkdownRenderers } from "@components/CustomRenderers";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/layout";
import PostHeader from "@components/post-header";
import { allNotes, type Note } from "@contentlayer/generated";
import slugify from "@sindresorhus/slugify";
import { useMDXComponent } from "next-contentlayer/hooks";
import { travelingStoryNames } from "..";

type Props = {
  children: React.ReactNode;
  post: Note;
};

export const NotesLayout = ({
  children,
  post: { excerpt, slug, cover, title, date, parentFolder },
}: Props) => {
  const url = `travel/${parentFolder}/${slug}`;
  return (
    <Layout
      description={excerpt || ""}
      title={title}
      image={cover?.src || ""}
      url={url}
      imageAlt={cover?.alt || ""}
    >
      <article className="main-section main-text post-body">
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
    .filter(({ path }) => {
      const name = path.split("/").at(-2);
      if (!name) console.error("No name found for", path);
      else return travelingStoryNames.includes(slugify(name));
    })
    .map(({ slug, path }) => ({
      params: {
        tripName: slugify(path.split("/").at(-2) || ""),
        storyName: slug,
      },
    }));

  console.log(paths);

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

type Params = { params: { storyName: string } };

export async function getStaticProps({ params }: Params) {
  console.log(params);
  const note = allNotes.find((post: Note) => post.slug === params.storyName);

  return {
    props: { post: replaceUndefinedWithNull(note) },
  };
}
