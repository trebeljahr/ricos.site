import { format } from "date-fns";

type Props = {
  date: string;
  readingTime: number;
  withAuthorInfo?: boolean;
  longFormDate?: boolean;
};

export const MetadataDisplay = ({
  date,
  readingTime,
  withAuthorInfo = false,
  longFormDate = true,
}: Props) => {
  return (
    <div className="text-xs mt-3 text-gray-900 dark:text-white">
      <span className="text-xs mr-4 mb-1 mt-1">🕓 {readingTime} min</span>{" "}
      <span>
        ✏️ {longFormDate && `Published on `}
        <time dateTime={date}>
          {format(new Date(date), longFormDate ? "LLLL	d, yyyy" : "MMM d, yyyy")}
        </time>
        {withAuthorInfo && " by Rico Trebeljahr"}
      </span>
    </div>
  );
};
