import { ClockEgg } from "@components/EasterEggs/Clock";
import { format } from "date-fns";

type Props = {
  date?: string;
  readingTime?: number;
  amountOfStories?: number;
  withAuthorInfo?: boolean;
  longFormDate?: boolean;
  /** Turn the reading-time clock into an easter egg. Off inside cards, which are links. */
  clockEgg?: boolean;
};

const _MetadataDisplay = ({
  date,
  readingTime,
  amountOfStories,
  withAuthorInfo = false,
  longFormDate = true,
  clockEgg = false,
}: Props) => {
  return (
    <div className="text-sm text-gray-700 dark:text-gray-200">
      {readingTime && (
        <span className="text-sm mr-4 mb-hair mt-hair">
          {clockEgg ? <ClockEgg /> : "🕓"} {readingTime} min
        </span>
      )}
      {amountOfStories && (
        <span className="text-sm mr-4 mb-hair mt-hair">📚 {amountOfStories} stories</span>
      )}
      {date && (
        <span>
          ✏️ {longFormDate && `Published on `}
          <time dateTime={date} suppressHydrationWarning>
            {format(new Date(date), longFormDate ? "LLLL	d, yyyy" : "MMM d, yyyy")}
          </time>
          {withAuthorInfo && " by Rico Trebeljahr"}
        </span>
      )}
    </div>
  );
};

export default _MetadataDisplay;
