import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { confirmedLists, DEFAULT_LIST, NEWSLETTER_LISTS } from "src/lib/newsletter/lists";

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
  // The page is static: `?lists=` is known only once the router is ready,
  // so name no list before then rather than flash the wrong one.
  const router = useRouter();
  const lists = router.isReady ? confirmedLists(router.query.lists) : [];
  const others = lists.filter((list) => list !== DEFAULT_LIST);

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
        <article className="mx-auto max-w-prose px-gutter pt-page-top pb-region">
          <Header title="Welcome aboard!" />
          {lists.includes(DEFAULT_LIST) && (
            <>
              <p className="text-lg">
                You have successfully confirmed your subscription to Live and Learn. Emails go out
                every two weeks on Sunday.
              </p>
              <p>
                Can&apos;t wait? You can read all of the older newsletters at{" "}
                <Link href="/newsletters">/newsletters</Link>.
              </p>
            </>
          )}
          {others.map((key) => (
            <p key={key} className="text-lg">
              You have successfully confirmed your subscription to {NEWSLETTER_LISTS[key].name}.{" "}
              {NEWSLETTER_LISTS[key].promise} {NEWSLETTER_LISTS[key].cadence}
            </p>
          ))}
          <p>
            Or check out some of my other writing at <Link href="/posts">/posts</Link>.
          </p>
        </article>
      </Layout>
    </>
  );
}
