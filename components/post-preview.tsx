import DateFormatter from "./date-formatter";
import { PostCoverImage } from "./cover-image";
import Link from "next/link";
import Author from "../types/author";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: Author;
  slug: string;
};

const PostPreview = ({ title, coverImage, date, excerpt, slug }: Props) => {
  return (
    <Link as={`/posts/${slug}`} href="/posts/[slug]">
      <a>
        <div className="more-posts-preview">
          <div className="more-posts-image">
            <PostCoverImage title={title} src={coverImage} />
          </div>
          <div className="more-posts-preview-text">
            <h2>{title}</h2>
            <DateFormatter dateString={date} />
            <p>{excerpt}</p>
          </div>
        </div>
      </a>
    </Link>
  );
};

export default PostPreview;
