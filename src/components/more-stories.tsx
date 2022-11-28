import { Post } from "contentlayer/generated";
import Link from "next/link";

type Props = {
  posts: Post[];
};

export const ReadMore = ({ posts }: Props) => {
  return (
    <div className="read-more">
      <h2>Keep reading:</h2>
      {posts.map(({ slug, title }) => {
        return (
          <h3 key={slug}>
            <Link as={slug} href={slug}>
              {title}
            </Link>
          </h3>
        );
      })}
    </div>
  );
};
