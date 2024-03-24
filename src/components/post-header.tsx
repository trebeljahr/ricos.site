import DateFormatter from "./date-formatter";
import { PostSubTitle, PostTitle } from "./post-title";

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
