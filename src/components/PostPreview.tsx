import { type Travelblog, type Post } from "@velite";
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
  return <NiceCard title={title} cover={cover} excerpt={excerpt} link={slug} />;
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
      {posts.map(({ slug, link, title, excerpt, cover }, index) => {
        const priority = index <= 1;

        return (
          <NiceCard
            key={slug}
            cover={cover}
            link={link}
            excerpt={excerpt}
            priority={priority}
            title={title}
          />
        );
      })}
    </div>
  );
};
