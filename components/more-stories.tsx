import PostPreview from "./post-preview";
import Post from "../types/post";
import Link from "next/link";

type Props = {
  posts: Post[];
};

export const ReadMore = ({ posts }: { posts: Post[] }) => {
  return (
    <div className="read-more">
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
      <h2 className="more-stories-title">More Stories</h2>
      <div className="more-stories-container">
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
