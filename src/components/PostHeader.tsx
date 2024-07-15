import DateFormatter from "./DateFormatter";

type Props = {
  title: string;
  date?: string;
  subtitle?: string;
};

const PostHeader = ({ title, subtitle, date }: Props) => {
  return (
    <header className="not-prose post-header mb-10">
      {date && <DateFormatter date={date} />}
      <h1>{title}</h1>
      <p className="text-lg">{subtitle}</p>
    </header>
  );
};

export default PostHeader;
