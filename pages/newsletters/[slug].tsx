import { useRouter } from "next/router";
import PostBody from "../../components/post-body";
import Layout from "../../components/layout";
import { getAllNewsletters, getNewsletterBySlug } from "../../lib/api";
import { PostTitle } from "../../components/post-title";
import { ToTopButton } from "../../components/ToTopButton";
import { Post as PostType } from "../../types/post";
import Image from "next/image";

type Props = {
  newsletter: PostType;
  slug: string;
};

const Newsletter = ({ newsletter, slug }: Props) => {
  const router = useRouter();

  return (
    <Layout description={newsletter.excerpt} pageTitle={`Newsletter ${slug}`}>
      {router.isFallback ? (
        <PostTitle>Loading…</PostTitle>
      ) : (
        <>
          <article className="post-body">
            <div className="header-image-container">
              <Image
                src={`/assets/newsletter/${slug}.jpg`}
                layout="fill"
                objectFit="cover"
                alt={`Cover for Newsletter #${slug}`}
              />
            </div>
            <PostBody content={newsletter.content} />
          </article>

          <ToTopButton />
        </>
      )}
    </Layout>
  );
};

export default Newsletter;

type Params = {
  params: {
    slug: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const newsletter = getNewsletterBySlug(params.slug, ["content"]);

  return {
    props: {
      newsletter,
      slug: params.slug,
    },
  };
}

export async function getStaticPaths() {
  const newsletter = getAllNewsletters(["slug"]);

  return {
    paths: newsletter.map((newsletter) => {
      return {
        params: {
          slug: newsletter.slug,
        },
      };
    }),
    fallback: false,
  };
}
