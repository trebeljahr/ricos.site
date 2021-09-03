import Link from "next/link";
interface Props {
  withLink?: boolean;
  withMotto?: boolean;
}
const Intro = ({ withLink = true, withMotto = true }: Props) => {
  return (
    <div className="header">
      {withLink ? (
        <Link href="/">
          <h1 className="header-title-with-link">
            <a>trebeljahr.</a>
          </h1>
        </Link>
      ) : (
        <h1 className="header-title-without-link">trebeljahr.</h1>
      )}
      {withMotto && (
        <p className="header-motto">
          Thoughts and Learnings from a curious person
        </p>
      )}
    </div>
  );
};

export default Intro;
