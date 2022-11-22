import { Post } from "../@types/post";
import Link from "next/link";

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
