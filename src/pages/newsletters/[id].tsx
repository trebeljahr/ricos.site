import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import { PostBodyWithoutExcerpt } from "@components/PostBody";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { newsletters, type Newsletter as NewsletterType } from "@velite";
import { byOnlyPublished } from "src/lib/utils";

type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
};

const Newsletter = ({
  newsletter: {
    excerpt,
    title,
    number,
    slugTitle,
    content,
    tags,
    cover,
    date,
    metadata: { readingTime },
  },
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
      keywords={tags.split(",")}
      image={cover.src}
      imageAlt={cover.alt}
      withProgressBar={true}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs
          path={url}
          overwrites={[{ matchingPath: slugTitle, newText: `${number}` }]}
        />
        <MetadataDisplay date={date} readingTime={readingTime} />

        <article>
          <Header title={fullTitle} />
          <div className="mb-5">
            <ImageWithLoader
              priority
              src={cover.src}
              width={768}
              height={768}
              alt={cover.alt}
              sizes="100vw"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
              }}
            />
          </div>

          <div className="mx-auto max-w-prose mt-20">
            {excerpt && <p>{excerpt}</p>}

            <PostBodyWithoutExcerpt content={content} />
            <NewsletterForm />
          </div>
        </article>

        <footer>
          <NextAndPrevArrows nextPost={nextPost} prevPost={prevPost} />
          <ToTopButton />
        </footer>
      </main>
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
