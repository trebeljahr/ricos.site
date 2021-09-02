import DateFormatter from "./date-formatter";
import CoverImage from "./cover-image";
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
      <div className="more-posts-preview">
        <div className="more-posts-image">
          <CoverImage slug={slug} title={title} src={coverImage} />
        </div>
        <h2>{title}</h2>
        <DateFormatter dateString={date} />
        <p>{excerpt}</p>
      </div>
    </Link>
  );
};

export default PostPreview;
