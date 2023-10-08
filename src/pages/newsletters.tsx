import { allNewsletters } from "@contentlayer/generated";
import Link from "next/link";
import { ToTopButton } from "../components/ToTopButton";
import Layout from "../components/layout";
import { NewsletterForm } from "../components/newsletter-signup";
import Image from "next/image";
import { nextImageUrl } from "src/lib/mapToImageProps";

type NewsletterData = {
  slug: string;
  newsletterNumber: number;
  title: string;
  excerpt: string;
  cover: {
    src: string;
    alt: string;
  };
};

type Props = {
  newsletterData: NewsletterData[];
};

const sortSlugs = (slugArray: NewsletterData[]) => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return slugArray.sort((a, b) => -collator.compare(a.slug, b.slug));
};

const Newsletters = ({ newsletterData }: Props) => {
  return (
    <Layout
      title="Newsletters - an archive of newsletters"
      description="An archive overview page of all the Newsletters I have published in the past at trebeljahr.com."
      url="newsletters"
    >
      <article className="posts-overview">
        <section className="main-section">
          {newsletterData.map(
            ({ slug, newsletterNumber, title, excerpt, cover }, index) => {
              const priority = index <= 1;

              return (
                <div
                  key={slug}
                  className="cursor-pointer overflow-hidden lg:grid mb-8 md:mb-20"
                  style={{
                    gridTemplateColumns: "17rem auto",
                    gridColumnGap: "2rem",
                  }}
                >
                  <div className="lg:h-full h-56 mb-4 relative">
                    <Image
                      src={cover.src}
                      alt={cover.alt}
                      fill
                      sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
                        priority ? 780 : 357
                      }`}
                      placeholder="blur"
                      blurDataURL={nextImageUrl(cover.src, 16, 1)}
                      priority={priority}
                      className="rounded-md"
                      style={{
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div>
                    <Link href={slug}>
                      <h2 className="pt-0">
                        {title} | Live and Learn #{newsletterNumber}
                      </h2>
                    </Link>

                    <p>{excerpt}</p>
                  </div>
                </div>
              );
            }
          )}
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};

export default Newsletters;

export const getStaticProps = async () => {
  const newsletterData = allNewsletters.map(
    ({ slug, newsletterNumber, title, excerpt = "", cover }) => ({
      slug,
      newsletterNumber,
      title,
      cover,
      excerpt: excerpt
        .replace("Welcome to this edition of Live and Learn. ", "")
        .replace("Enjoy.", ""),
    })
  );

  return {
    props: { newsletterData: sortSlugs(newsletterData) },
  };
};
