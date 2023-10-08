import { Post } from "@contentlayer/generated";
import Link from "next/link";
import { PostPreview } from "./post-preview";

type Props = {
  posts: Post[];
};

export const ReadMore = ({ posts }: Props) => {
  return (
    <div className="mt-10">
      <h2>Keep reading:</h2>
      {posts.map((post) => {
        return <PostPreview post={post} isHeroPost={false} />;
      })}
    </div>
  );
};
