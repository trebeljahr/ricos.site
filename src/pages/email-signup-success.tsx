import Layout from "../components/layout";
import Link from "next/link";
import Confetti from "react-confetti";
import { useEffect, useState } from "react";

interface Size {
  width: number | undefined;
  height: number | undefined;
}

function useWindowSize(): Size {
  const [windowSize, setWindowSize] = useState<Size>({
    width: undefined,
    height: undefined,
  });
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export default function EmailSignupSuccess() {
  const { width, height } = useWindowSize();

  return (
    <>
      {width && height && (
        <Confetti
          width={width}
          height={height}
          style={{ position: "absolute", top: 0, left: 0, width, height }}
        />
      )}

      <Layout
        title="Email Signup Success"
        description="This page is displayed when a user has successfully completed signup for the trebeljahr.com newsletter"
      >
        <article>
          <section className="main-section">
            <h1>Success</h1>
            <p>
              Welcome to my newsletter, emails go out Sunday every two weeks.
              Cant wait? You can still read all of the older newsletters that
              you missed so far at{" "}
              <Link as={`/newsletters`} href="/newsletters">
                <a>/newsletters</a>
              </Link>
              .
            </p>
            <p>
              Or alternatively check out some of my other writing at{" "}
              <Link as={`/posts`} href="/posts">
                <a>/posts</a>
              </Link>
              .
            </p>
          </section>
        </article>
      </Layout>
    </>
  );
}
