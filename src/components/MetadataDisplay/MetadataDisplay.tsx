import { format } from "date-fns";

type Props = {
  date?: string;
  readingTime?: number;
  amountOfStories?: number;
  withAuthorInfo?: boolean;
  longFormDate?: boolean;
};

const _MetadataDisplay = ({
  date,
  readingTime,
  amountOfStories,
  withAuthorInfo = false,
  longFormDate = true,
}: Props) => {
  return (
    <div className="text-sm mt-3 text-gray-700 dark:text-gray-200 font-light">
      {readingTime && (
        <span className="text-sm mr-4 mb-1 mt-1">🕓 {readingTime} min</span>
      )}
      {amountOfStories && (
        <span className="text-sm mr-4 mb-1 mt-1">
          📚 {amountOfStories} stories
        </span>
      )}
      {date && (
        <span>
          ✏️ {longFormDate && `Published on `}
          <time dateTime={date} suppressHydrationWarning>
            {format(
              new Date(date),
              longFormDate ? "LLLL	d, yyyy" : "MMM d, yyyy"
            )}
          </time>
          {withAuthorInfo && " by Rico Trebeljahr"}
        </span>
      )}
    </div>
  );
};

export default _MetadataDisplay;
