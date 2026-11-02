import { ClockEgg } from "@components/EasterEggs/Clock";
import { PenEgg } from "@components/EasterEggs/Pen";
import { Sprite } from "@components/Sprite";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// A card or post with a date otherwise pulls date-fns and its English locale
// tables, 30 KB of JavaScript, into the page for these two formats.
const formatDate = (date: string, longForm: boolean) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) throw new RangeError(`Invalid date: ${date}`);
  const month = MONTHS[parsed.getMonth()];
  const dayAndYear = `${parsed.getDate()}, ${parsed.getFullYear()}`;
  return longForm ? `${month} ${dayAndYear}` : `${month.slice(0, 3)} ${dayAndYear}`;
};

type Props = {
  date?: string;
  readingTime?: number;
  amountOfStories?: number;
  withAuthorInfo?: boolean;
  longFormDate?: boolean;
  /** Turn the clock and the pen into easter eggs. Off inside cards, which are links. */
  eggs?: boolean;
};

const _MetadataDisplay = ({
  date,
  readingTime,
  amountOfStories,
  withAuthorInfo = false,
  longFormDate = true,
  eggs = false,
}: Props) => {
  const dateLine = date && (
    <>
      {longFormDate && `Published on `}
      <time dateTime={date} suppressHydrationWarning>
        {formatDate(date, longFormDate)}
      </time>
      {withAuthorInfo && " by Rico Trebeljahr"}
    </>
  );

  return (
    <div className="text-sm text-gray-700 dark:text-gray-200">
      {readingTime && (
        <span className="text-sm mr-4 mb-hair mt-hair">
          {eggs ? <ClockEgg /> : <Sprite name="🕓" />} {readingTime} min
        </span>
      )}
      {amountOfStories && (
        <span className="text-sm mr-4 mb-hair mt-hair">
          <Sprite name="📚" /> {amountOfStories} stories
        </span>
      )}
      {date && (
        <span>
          {eggs ? (
            <PenEgg>{dateLine}</PenEgg>
          ) : (
            <>
              <Sprite name="✏️" /> {dateLine}
            </>
          )}
        </span>
      )}
    </div>
  );
};

export default _MetadataDisplay;
