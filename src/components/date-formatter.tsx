import { parseISO, format, parse } from "date-fns";

type Props = {
  date: string;
};

export function parseDate(dateString: string) {
  let date;
  if (dateString.match(/\d{2}.\d{2}.\d{4}/)) {
    date = parse(dateString, "dd.MM.yyyy", new Date());
  } else {
    date = parseISO(dateString);
  }
  return date;
}

const DateFormatter = ({ date: dateString }: Props) => {
  return (
    <div className="publish-date">
      <time dateTime={dateString}>
        {format(parseDate(dateString), "LLLL	d, yyyy")}
      </time>
    </div>
  );
};

export default DateFormatter;
