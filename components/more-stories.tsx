import PostPreview from "./post-preview";
import Post from "../types/post";
import Link from "next/link";

type Props = {
  posts: Post[];
};

export const ReadMore = ({ posts }: { posts: Post[] }) => {
  return (
    <div className="readMore">
      <h2>Keep reading:</h2>
      {posts.map((post) => {
        return (
          <h3 key={post.slug}>
            <Link as={`/posts/${post.slug}`} href={"/posts/[slug]"}>
              {post.title}
            </Link>
          </h3>
        );
      })}
    </div>
  );
};

const MoreStories = ({ posts }: Props) => {
  return (
    <section>
      <h2 className="hidden md:block moreStories mt-12 mb-8 text-6xl md:text-7xl font-bold tracking-tighter leading-tight">
        More Stories
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 lg:gap-x-16 gap-y-10 md:gap-y-12 mb-32">
        {posts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
          />
        ))}
      </div>
    </section>
  );
};

export default MoreStories;
