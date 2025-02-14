import { BreadCrumbs } from "@components/BreadCrumbs";
import { BookCover } from "@components/CoverImage";
import { ExternalLink } from "@components/ExternalLink";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Booknote, booknotes } from "@velite";
import { FaInfo } from "react-icons/fa";
import { byOnlyPublished } from "src/lib/utils";

type Props = {
  booknote: Booknote;
};

const AmazonLinkDisclaimer = () => {
  return (
    <div className="ml-2 group relative inline-block dark:text-white">
      <button
        type="button"
        className="rounded-full p-2 bg-slate-200 dark:bg-gray-800"
      >
        <FaInfo className="w-3 h-3" />
      </button>

      <div className="invisible absolute left-0 -mt-[2px] flex flex-col group-focus-within:visible group-active:visible">
        <div className="ml-1 inline-block overflow-hidden">
          <div className="h-3 w-3 origin-bottom-left rotate-45 transform  bg-slate-200 dark:bg-gray-800"></div>
        </div>

        <div className="flex w-44 flex-col rounded-md bg-slate-200 dark:bg-gray-800 p-3">
          <span className="text-xs">
            This is an affiliate link. If you buy the book through this link, I
            will get a small commission. This does not affect the price you pay
            🤗
          </span>
        </div>
      </div>
    </div>
  );
};

const BuyItOnAmazon = ({ link }: { link: string }) => {
  if (!link) {
    return null;
  }

  return (
    <div className="flex items-center">
      <ExternalLink href={link}>Buy it on Amazon</ExternalLink>
      <AmazonLinkDisclaimer />
    </div>
  );
};

const BooknoteComponent = ({ booknote }: Props) => {
  return <MDXContent source={booknote.content} />;
};

const BooknotesWithDefault = ({ booknote }: Props) => {
  if (!booknote?.content) {
    return (
      <div>
        <p className="placeholder-text">
          I have read this book, but did not write booknotes or a summary for it
          yet. For now, this is all there is.
        </p>
      </div>
    );
  }

  return <BooknoteComponent booknote={booknote} />;
};

const Book = ({ booknote }: Props) => {
  const defaultDescription = `These are the book Notes for ${booknote.title} by ${booknote.bookAuthor}`;
  const url = `booknotes/${booknote.slug}`;
  return (
    <Layout
      title={`Rico's booknotes for ${booknote.title}`}
      description={booknote.excerpt || defaultDescription}
      url={url}
      keywords={booknote.tags.split(",")}
      image={booknote.cover.src}
      imageAlt={booknote.cover.alt}
      withProgressBar={true}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />
        <MetadataDisplay
          readingTime={booknote.metadata.readingTime}
          date={booknote.date}
        />
        <article>
          <section className="flex !mt-16">
            <div className="block relative mr-2 w-60 overflow-hidden rounded-md">
              <BookCover
                title={booknote.title}
                src={booknote.cover.src}
                alt={booknote.cover.alt}
                priority={true}
              />
            </div>
            <header className="h-fit w-full ml-5">
              <hgroup>
                <h1 className="!my-2">{booknote.title}</h1>
                <p>{booknote.subtitle}</p>
                <p>by {booknote.bookAuthor}</p>
                <p>🏆 Rated: {booknote.rating}/10</p>
                <BuyItOnAmazon link={booknote.amazonAffiliateLink} />
              </hgroup>
            </header>
          </section>
          <section>
            <BooknotesWithDefault booknote={booknote} />
            <BuyItOnAmazon link={booknote.amazonAffiliateLink} />
          </section>
        </article>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};

export default Book;

type Params = {
  params: {
    id: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const booknote = booknotes
    .filter(byOnlyPublished)
    .find(({ slug }) => params.id === slug);

  return {
    props: {
      booknote,
    },
  };
}

export async function getStaticPaths() {
  const paths = booknotes.filter(byOnlyPublished).map((book) => {
    return {
      params: {
        id: book.slug,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}
