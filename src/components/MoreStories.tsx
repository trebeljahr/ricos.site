import { Post } from "@contentlayer/generated";
import Link from "next/link";
import { PostPreview } from "./PostPreview";
import React from "react";

type Props = {
  posts: Post[];
};

export const ReadMore = ({ posts }: Props) => {
  return (
    <div className="mt-10">
      <h2>Keep reading:</h2>
      {posts.map((post) => {
        return <PostPreview key={post.title} post={post} isHeroPost={false} />;
      })}
    </div>
  );
};
