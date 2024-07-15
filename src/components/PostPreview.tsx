import { type Note, type Post } from "@contentlayer/generated";
import Link from "next/link";
import { PostCoverImage } from "./CoverImage";
import { NiceCard } from "./NiceCard";

interface PreviewTextProps {
  title: string;
  excerpt: string;
}

const PostPreviewText = ({ title, excerpt }: PreviewTextProps) => {
  return (
    <div className="post-preview-text">
      <h2>{title}</h2>
      <p>{excerpt}</p>
    </div>
  );
};

interface PreviewImageProps {
  title: string;
  src: string;
  priority?: boolean;
}

const PostPreviewImage = ({
  title,
  src,
  priority = false,
}: PreviewImageProps) => {
  return (
    <div className="post-preview-image">
      <PostCoverImage title={title} src={src} priority={priority} alt="" />
    </div>
  );
};

type Props = {
  post: Post | Note;
  isHeroPost?: boolean;
};

export const PostPreview = ({
  post: { title, cover, excerpt, slug },
  isHeroPost = false,
}: Props) => {
  return (
    <Link
      as={slug}
      href={slug}
      className={isHeroPost ? "hero-post-preview" : "post-preview"}
      passHref
    >
      <>
        <PostPreviewImage
          title={title}
          src={cover?.src || ""}
          priority={isHeroPost}
        />
        <PostPreviewText title={title} excerpt={excerpt} />
      </>
    </Link>
  );
};

export const HeroPostPreview = ({ post }: { post: Post | Note }) => {
  return (
    <section>
      <h1 className="posts-page-title">Latest Post:</h1>
      <div className="hero-post-container">
        <PostPreview post={post} isHeroPost={true} />
      </div>
    </section>
  );
};

export const OtherPostsPreview = ({
  posts,
  morePostsText = "More Posts:",
}: {
  posts: Post[] | Note[];
  morePostsText?: string | null;
}) => {
  return (
    <section>
      {morePostsText && <h2 className="posts-page-title">{morePostsText}</h2>}
      <div className="other-posts-container">
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
    </section>
  );
};
