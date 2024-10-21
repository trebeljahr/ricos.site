import { format } from "date-fns";
type Props = {
  date: string;
};

const DateFormatter = ({ date }: Props) => {
  return (
    <div className="text-sm mb-5 mt-5">
      <time dateTime={date}>{format(new Date(date), "LLLL	d, yyyy")}</time> by
      Rico Trebeljahr
    </div>
  );
};

export default DateFormatter;
