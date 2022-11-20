import { DetailedHTMLProps, HTMLAttributes, useEffect, useState } from "react";

type PreProps = DetailedHTMLProps<
  HTMLAttributes<HTMLPreElement>,
  HTMLPreElement
>;

export function ToggleCode(props: PreProps) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {}, [hidden]);

  const toggleHidden = () => {
    setHidden((old) => !old);
  };

  return (
    <>
      <button onClick={toggleHidden}>
        {hidden ? (
          <p>
            Show Code <span className="icon-chevron-down" />
          </p>
        ) : (
          <p>
            Hide Code <span className="icon-chevron-up" />
          </p>
        )}
      </button>
      {!hidden && <pre {...props}>{props.children}</pre>}
    </>
  );
}
