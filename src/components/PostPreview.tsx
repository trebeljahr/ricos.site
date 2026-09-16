import type { CommonMetadata } from "src/@types";
import { Card } from "./Card";

type Props = {
  post: CommonMetadata;
  isHeroPost?: boolean;
};

export const PostPreview = ({
  post: {
    title,
    cover,
    markdownExcerpt,
    slug,
    date,
    metadata: { readingTime },
  },
}: Props) => {
  return (
    <Card
      layout="horizontal"
      title={title}
      cover={cover}
      markdownExcerpt={markdownExcerpt}
      link={slug}
      date={date}
      readingTime={readingTime}
    />
  );
};

export const OtherPostsPreview = ({ posts }: { posts: CommonMetadata[] }) => {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div>
      {posts.map(
        ({ slug, link, title, markdownExcerpt, cover, date, metadata: { readingTime } }, index) => {
          const priority = index === 0;

          return (
            <Card
              layout="horizontal"
              key={slug}
              cover={cover}
              link={link}
              markdownExcerpt={markdownExcerpt}
              priority={priority}
              title={title}
              date={date}
              readingTime={readingTime}
            />
          );
        },
      )}
    </div>
  );
};
