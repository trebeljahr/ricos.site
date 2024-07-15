import DateFormatter from "./DateFormatter";

type Props = {
  title: string;
  date?: string;
  subtitle?: string;
};

const PostHeader = ({ title, subtitle, date }: Props) => {
  return (
    <header className="post-header mb-10">
      {date && <DateFormatter date={date} />}
      <h1 className="mb-0 mt-10">{title}</h1>
      <p className="mt-1 text-lg">{subtitle}</p>
    </header>
  );
};

export default PostHeader;
