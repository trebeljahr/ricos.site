import { type Post, type Travelblog } from "@velite";
import { NiceCard } from "./NiceCard";

type Props = {
  post: Post | Travelblog;
  isHeroPost?: boolean;
};

export const PostPreview = ({
  post: {
    title,
    cover,
    excerpt,
    slug,
    date,
    metadata: { readingTime },
  },
}: Props) => {
  return (
    <NiceCard
      title={title}
      cover={cover}
      excerpt={excerpt}
      link={slug}
      date={date}
      readingTime={readingTime}
    />
  );
};

export const OtherPostsPreview = ({
  posts,
}: {
  posts: Post[] | Travelblog[];
}) => {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div>
      {posts.map(
        (
          {
            slug,
            link,
            title,
            excerpt,
            cover,
            date,
            metadata: { readingTime },
          },
          index
        ) => {
          const priority = index <= 1;

          return (
            <NiceCard
              key={slug}
              cover={cover}
              link={link}
              excerpt={excerpt}
              priority={priority}
              title={title}
              date={date}
              readingTime={readingTime}
            />
          );
        }
      )}
    </div>
  );
};
