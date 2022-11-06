import PostBody from "../../components/post-body";
import Layout from "../../components/layout";
import { getAllNewsletters, getNewsletterBySlug } from "../../lib/api";
import { ToTopButton } from "../../components/ToTopButton";
import { Post as PostType } from "../../@types/post";
import Image from "next/image";
import { NewsletterForm } from "../../components/newsletter-signup";
import { UtteranceComments } from "../../components/comments";

type Props = {
  newsletter: PostType;
  slug: string;
};

const Newsletter = ({ newsletter, slug }: Props) => {
  return (
    <Layout description={newsletter.excerpt} title={`Newsletter ${slug}`}>
      <article className="newsletter-article">
        <div className="header-image-container">
          <Image
            src={`/assets/newsletter/${slug}.jpg`}
            layout="fill"
            objectFit="cover"
            alt={`Cover for Newsletter #${slug}`}
          />
        </div>
        <section className="post-body main-section">
          <PostBody content={newsletter.content} />
        </section>
        <section className="main-section">
          <NewsletterForm />
          <UtteranceComments />
          <ToTopButton />
        </section>
      </article>
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
