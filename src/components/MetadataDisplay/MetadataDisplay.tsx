import { ClockEgg } from "@components/EasterEggs/Clock";
import { PenEgg } from "@components/EasterEggs/Pen";
import { format } from "date-fns";

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
        {format(new Date(date), longFormDate ? "LLLL	d, yyyy" : "MMM d, yyyy")}
      </time>
      {withAuthorInfo && " by Rico Trebeljahr"}
    </>
  );

  return (
    <div className="text-sm text-gray-700 dark:text-gray-200">
      {readingTime && (
        <span className="text-sm mr-4 mb-hair mt-hair">
          {eggs ? <ClockEgg /> : "🕓"} {readingTime} min
        </span>
      )}
      {amountOfStories && (
        <span className="text-sm mr-4 mb-hair mt-hair">📚 {amountOfStories} stories</span>
      )}
      {date && <span>{eggs ? <PenEgg>{dateLine}</PenEgg> : <>✏️ {dateLine}</>}</span>}
    </div>
  );
};

export default _MetadataDisplay;
