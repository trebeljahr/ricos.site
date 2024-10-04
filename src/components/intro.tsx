import Link from "next/link";
interface Props {
  withLink?: boolean;
  withMotto?: boolean;
}

const Intro = ({ withLink = true, withMotto = true }: Props) => {
  return (
    <div className="header">
      {withLink ? (
        <Link as="/" href="/" className="header-title-with-link">
          trebeljahr.
        </Link>
      ) : (
        <p className="header-title-without-link">trebeljahr.</p>
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
