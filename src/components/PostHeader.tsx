import DateFormatter from "./DateFormatter";

type Props = {
  title: string;
  date?: string;
  subtitle?: string;
};

const PostHeader = ({ title, subtitle, date }: Props) => {
  return (
    <div className="post-header mb-6">
      <h1>{title}</h1>
      <h2>{subtitle}</h2>
      {date && <DateFormatter date={date} />}
    </div>
  );
};

export default PostHeader;
