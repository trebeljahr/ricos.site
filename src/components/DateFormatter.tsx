import { format } from "date-fns";

type Props = {
  date: string;
  readingTime: number;
  withAuthorInfo?: boolean;
};

export const MetadataDisplay = ({
  date,
  readingTime,
  withAuthorInfo = true,
}: Props) => {
  return (
    <div className="text-sm mt-3 text-gray-900 dark:text-white">
      <span className="text-sm mr-4 mb-1 mt-1">🕓 {readingTime} min read</span>
      ✏️ Published on{" "}
      <time dateTime={date}>{format(new Date(date), "LLLL	d, yyyy")}</time>{" "}
      {withAuthorInfo && "by Rico Trebeljahr"}
    </div>
  );
};
