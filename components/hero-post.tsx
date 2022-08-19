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

const HeroPost = ({ title, coverImage, date, excerpt, slug }: Props) => {
  return (
    <Link as={`/posts/${slug}`} href="/posts/[slug]">
      <a>
        <section className="hero-post-preview">
          <div className="hero-post-image">
            <PostCoverImage title={title} src={coverImage} />
          </div>
          <div className="post-preview-text">
            <h2>{title}</h2>
            <DateFormatter dateString={date} />
            <p>{excerpt}</p>
          </div>
        </section>
      </a>
    </Link>
  );
};

export default HeroPost;
