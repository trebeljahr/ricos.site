import { format } from "date-fns";
type Props = {
  date: string;
  readingTime: number;
};

export const MetadataDisplay = ({ date, readingTime }: Props) => {
  return (
    <div className="text-sm mt-3">
      <span className="text-sm mr-4 mb-1 mt-1">🕓 {readingTime} min read</span>
      ✏️ Published on{" "}
      <time dateTime={date}>{format(new Date(date), "LLLL	d, yyyy")}</time> by
      Rico Trebeljahr
    </div>
  );
};
