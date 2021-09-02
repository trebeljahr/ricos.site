import { AvatarWithAuthor as Avatar } from "./avatar";
import DateFormatter from "./date-formatter";
import { PostTitle, PostSubTitle } from "./post-title";
import Author from "../types/author";

type Props = {
  title: string;
  date: string;
  author: Author;
  subtitle?: string;
};

const PostHeader = ({ title, subtitle, date, author }: Props) => {
  return (
    <div className="post-header">
      <PostTitle>{title}</PostTitle>
      <PostSubTitle>{subtitle}</PostSubTitle>
      <div className="post-meta">
        <DateFormatter dateString={date} />
        <Avatar name={author.name} picture={author.picture} />
      </div>
    </div>
  );
};

export default PostHeader;
