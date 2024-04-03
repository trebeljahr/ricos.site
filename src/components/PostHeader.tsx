import DateFormatter from "./DateFormatter";
import { PostSubTitle, PostTitle } from "./PostTitle";

type Props = {
  title: string;
  date?: string;
  subtitle?: string;
};

const PostHeader = ({ title, subtitle, date }: Props) => {
  return (
    <div className="post-header">
      <PostTitle>{title}</PostTitle>
      <PostSubTitle>{subtitle}</PostSubTitle>
      {date && <DateFormatter date={date} />}
    </div>
  );
};

export default PostHeader;
