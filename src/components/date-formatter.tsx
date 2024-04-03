import { format } from "date-fns";
import { parseDate } from "../lib/dateUtils";

type Props = {
  date: string;
};

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
