import { format } from "date-fns";
import { parseDate } from "../lib/dateUtils";
type Props = {
  date: string;
};

const DateFormatter = ({ date: dateString }: Props) => {
  return (
    <div className="text-sm mb-5 mt-5">
      <time dateTime={dateString}>
        {format(parseDate(dateString), "LLLL	d, yyyy")}
      </time>{" "}
      by Rico Trebeljahr
    </div>
  );
};

export default DateFormatter;
