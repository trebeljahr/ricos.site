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

const HeroPost = ({ title, coverImage, date, excerpt, slug }: Props) => {
  return (
    <Link as={`/posts/${slug}`} href="/posts/[slug]">
      <section className="hero-post-preview">
        <div className="hero-post-image">
          <CoverImage title={title} src={coverImage} slug={slug} />
        </div>
        <h2>{title}</h2>
        <DateFormatter dateString={date} />
        <p>{excerpt}</p>
      </section>
    </Link>
  );
};

export default HeroPost;
