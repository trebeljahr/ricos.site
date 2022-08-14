import Link from "next/link";
interface Props {
  withLink?: boolean;
  withMotto?: boolean;
}

const Intro = ({ withLink = true, withMotto = true }: Props) => {
  return (
    <div className="header">
      {withLink ? (
        <Link as="/" href="/">
          <a>
            <h1 className="header-title-with-link">trebeljahr.</h1>
          </a>
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
