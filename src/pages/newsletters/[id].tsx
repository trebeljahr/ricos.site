import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { NewsletterModalPopup } from "@components/NewsletterModalPopup";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import { PostBodyWithoutExcerpt } from "@components/PostBody";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { newsletters, type Newsletter as NewsletterType } from "@velite";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { byOnlyPublished } from "src/lib/utils";

type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
};

const Newsletter = ({
  newsletter: { excerpt, title, number, slugTitle, content, cover, date },
  nextPost,
  prevPost,
}: Props) => {
  const fullTitle = title + " – Live and Learn #" + number;
  const url = `newsletters/${slugTitle}`;

  return (
    <Layout
      title={fullTitle}
      description={excerpt || ""}
      url={url}
      image={cover.src}
      imageAlt={cover.alt}
    >
      <NewsletterModalPopup />

      <BreadCrumbs
        path={url}
        overwrites={[{ matchingPath: slugTitle, newText: `${number}` }]}
      />

      <main>
        <article className="maint-text newsletter-article">
          <Header title={fullTitle} date={date} />
          {excerpt && <p>{excerpt}</p>}
          <div className="mb-5">
            <ImageWithLoader
              priority
              src={cover.src}
              width={780}
              height={780}
              alt={cover.alt}
              sizes="100vw"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
              }}
            />
          </div>
          <PostBodyWithoutExcerpt content={content} />
        </article>
      </main>

      <footer>
        <NextAndPrevArrows nextPost={nextPost} prevPost={prevPost} />
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
};

export default Newsletter;

type Params = {
  params: {
    id: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const newsletter = newsletters.find(
    ({ slugTitle }) => slugTitle === params.id
  );
  if (!newsletter) throw Error("Newsletter not found");

  const number = parseInt(newsletter.number);
  const next = number + 1;
  const prev = number - 1;

  let nextPost = newsletters.find(({ number }) => parseInt(number) === next);
  let prevPost = newsletters.find(({ number }) => parseInt(number) === prev);

  return {
    props: {
      newsletter,
      nextPost: nextPost?.slugTitle || null,
      prevPost: prevPost?.slugTitle || null,
    },
  };
}

export async function getStaticPaths() {
  const newsletterTitles = newsletters
    .filter(byOnlyPublished)
    .map(({ slugTitle }) => {
      return {
        params: {
          id: slugTitle,
        },
      };
    });

  return {
    paths: newsletterTitles,
    fallback: false,
  };
}
