import { type Travelblog, type Post } from "@contentlayer/generated";
import { NiceCard } from "./NiceCard";
interface PreviewTextProps {
  title: string;
  excerpt: string;
}

type Props = {
  post: Post | Travelblog;
  isHeroPost?: boolean;
};

export const PostPreview = ({
  post: { title, cover, excerpt, slug },
}: Props) => {
  return <NiceCard title={title} cover={cover} excerpt={excerpt} slug={slug} />;
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
      {posts.map(({ slug, title, excerpt, cover }, index) => {
        const priority = index <= 1;

        return (
          <NiceCard
            key={slug}
            cover={cover}
            slug={slug}
            excerpt={excerpt}
            priority={priority}
            title={title}
          />
        );
      })}
    </div>
  );
};
