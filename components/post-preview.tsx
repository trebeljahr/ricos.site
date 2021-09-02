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
      <div className="more-posts-preview cursor-pointer">
        <div className="mb-5 more-posts-image">
          <CoverImage slug={slug} title={title} src={coverImage} />
        </div>
        <h3 className="text-3xl mb-3 leading-none font-bold">{title}</h3>
        <div className="text-lg mb-4">
          <DateFormatter dateString={date} />
        </div>
        <p className="text-lg leading-none mb-4">{excerpt}</p>
      </div>
    </Link>
  );
};

export default PostPreview;
