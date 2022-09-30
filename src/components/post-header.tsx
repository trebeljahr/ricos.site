import { AvatarWithAuthor as Avatar } from "./avatar";
import DateFormatter from "./date-formatter";
import { PostTitle, PostSubTitle } from "./post-title";
import Author from "../@types/author";

type Props = {
  title: string;
  date?: string;
  author?: Author;
  subtitle?: string;
};

const PostHeader = ({ title, subtitle, date, author }: Props) => {
  return (
    <div className="post-header">
      <PostTitle>{title}</PostTitle>
      <PostSubTitle>{subtitle}</PostSubTitle>
      {date || author ? (
        <div className="post-meta">
          {date && <DateFormatter date={date} />}
          {author && <Avatar name={author.name} picture={author.picture} />}
        </div>
      ) : null}
    </div>
  );
};

export default PostHeader;
