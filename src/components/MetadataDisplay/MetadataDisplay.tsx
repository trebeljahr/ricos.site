import { ClockEgg } from "@components/EasterEggs/Clock";
import { format } from "date-fns";
import { useState } from "react";

/** The reading time with a clock easter egg. Digits keep their width while they count. */
const ReadingTimeWithClock = ({ readingTime }: { readingTime: number }) => {
  const [minutes, setMinutes] = useState(readingTime);
  return (
    <span className="text-sm mr-4 mb-1 mt-1">
      <ClockEgg readingTime={readingTime} onMinutes={setMinutes} />
      <span
        className="inline-block text-right tabular-nums"
        style={{ minWidth: `${String(readingTime).length}ch` }}
      >
        {minutes}
      </span>{" "}
      min
    </span>
  );
};

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
    <div className="text-sm mt-3 text-gray-700 dark:text-gray-200">
      {readingTime && clockEgg ? (
        <ReadingTimeWithClock readingTime={readingTime} />
      ) : (
        readingTime && <span className="text-sm mr-4 mb-1 mt-1">🕓 {readingTime} min</span>
      )}
      {amountOfStories && (
        <span className="text-sm mr-4 mb-1 mt-1">📚 {amountOfStories} stories</span>
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
