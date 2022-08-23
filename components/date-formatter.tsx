import { parseISO, format } from "date-fns";

type Props = {
  date: string;
};

const DateFormatter = ({ date: dateString }: Props) => {
  const date = parseISO(dateString);
  return (
    <div className="publish-date">
      <time dateTime={dateString}>{format(date, "LLLL	d, yyyy")}</time>
    </div>
  );
};

export default DateFormatter;
