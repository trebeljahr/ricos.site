import Link from "next/link";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import Layout from "@components/Layout";
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
        description="You have successfully signed up for the Live and Learn newsletter by Rico Trebeljahr."
        url="email-signup-success"
        keywords={["newsletter", "email", "signup", "success"]}
        image="/assets/blog/success.png"
        imageAlt="a green success checkmark on a black background"
      >
        <article className="py-20 px-3 mx-auto max-w-prose">
          <h1 className="mt-16!">Welcome aboard!</h1>
          <p className="text-lg">
            You have successfully confirmed your subscription to Live and
            Learn. Emails go out every two weeks on Sunday.
          </p>
          <p>
            Can&apos;t wait? You can read all of the older newsletters at{" "}
            <Link href="/newsletters">/newsletters</Link>.
          </p>
          <p>
            Or check out some of my other writing at{" "}
            <Link href="/posts">/posts</Link>.
          </p>
        </article>
      </Layout>
    </>
  );
}
