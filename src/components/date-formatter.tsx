import { parseISO, format, parse } from "date-fns";

type Props = {
  date: string;
};

const DateFormatter = ({ date: dateString }: Props) => {
  let date;
  if (dateString.match(/\d{2}.\d{2}.\d{4}/)) {
    date = parse(dateString, "dd.MM.yyyy", new Date());
  } else {
    date = parseISO(dateString);
  }
  return (
    <div className="publish-date">
      <time dateTime={dateString}>{format(date, "LLLL	d, yyyy")}</time>
    </div>
  );
};

export default DateFormatter;
