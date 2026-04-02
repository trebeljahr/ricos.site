import Head from "next/head";
import { baseUrl, completeUrl } from "src/lib/urlUtils";
import { nextImageUrl } from "src/lib/mapToImageProps";

type ArticleJsonLdProps = {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt?: string;
  datePublished?: string;
  dateModified?: string;
  type: "article" | "book" | "website";
  bookAuthor?: string;
  bookRating?: number;
};

export const JsonLd = ({
  title,
  description,
  url,
  image,
  imageAlt,
  datePublished,
  dateModified,
  type,
  bookAuthor,
  bookRating,
}: ArticleJsonLdProps) => {
  const fullUrl = completeUrl(url);
  const imageUrl = image ? nextImageUrl(image, 1080) : undefined;

  const author = {
    "@type": "Person",
    name: "Rico Trebeljahr",
    url: baseUrl,
  };

  let schema: Record<string, unknown>;

  if (type === "book" && bookAuthor) {
    schema = {
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "Book",
        name: title.replace(/ – .+$/, ""),
        author: {
          "@type": "Person",
          name: bookAuthor,
        },
      },
      author,
      reviewBody: description,
      url: fullUrl,
      ...(bookRating && {
        reviewRating: {
          "@type": "Rating",
          ratingValue: bookRating,
          bestRating: 10,
        },
      }),
      ...(imageUrl && {
        image: {
          "@type": "ImageObject",
          url: imageUrl,
          ...(imageAlt && { name: imageAlt }),
        },
      }),
      ...(datePublished && { datePublished }),
      ...(dateModified && { dateModified }),
    };
  } else if (type === "article") {
    schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      url: fullUrl,
      author,
      publisher: {
        "@type": "Person",
        name: "Rico Trebeljahr",
        url: baseUrl,
      },
      ...(imageUrl && {
        image: {
          "@type": "ImageObject",
          url: imageUrl,
          width: 1080,
          ...(imageAlt && { name: imageAlt }),
        },
      }),
      ...(datePublished && { datePublished }),
      ...(dateModified && { dateModified }),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": fullUrl,
      },
    };
  } else {
    return null;
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

type BreadcrumbItem = {
  name: string;
  url: string;
};

export const BreadcrumbJsonLd = ({ items }: { items: BreadcrumbItem[] }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: completeUrl(item.url),
    })),
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

export const WebSiteJsonLd = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ricos.site",
    url: baseUrl,
    author: {
      "@type": "Person",
      name: "Rico Trebeljahr",
      url: baseUrl,
    },
    description:
      "Posts, newsletters, book notes, photography, travel stories, and creative coding experiments by Rico Trebeljahr.",
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};
