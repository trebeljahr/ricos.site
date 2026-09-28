import { DonationCard, DonationThanks, useDonationSupportedAt } from "@components/DonationCard";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { THANKS_QUERY_KEY } from "src/lib/donation";

export default function DonatePage() {
  // Stripe sends donors back here with ?thanks=1 (set per Payment Link in the
  // dashboard). Remember the moment so the inline asks stay quiet for a while.
  const router = useRouter();
  const justDonated = router.isReady && router.query[THANKS_QUERY_KEY] !== undefined;
  const [, setSupportedAt] = useDonationSupportedAt();

  useEffect(() => {
    if (justDonated) setSupportedAt(Date.now());
  }, [justDonated, setSupportedAt]);

  return (
    <Layout
      title="Donate – ricos.site"
      description="If something here was useful or made your day a little better, here are a few ways to help me keep making more of it."
      url="donate"
      keywords={[
        "donate",
        "support",
        "ko-fi",
        "patreon",
        "buy me a coffee",
        "sponsor",
        "Rico Trebeljahr",
      ]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Donate", url: "/donate" },
        ]}
      />
      <PageMain>
        <article className="mx-auto max-w-prose prose md:prose-lg xl:prose-xl dark:prose-invert">
          <Header breadcrumbs={{ path: "donate" }} title="Donate" />

          {/* A donor coming back from Stripe lands at the top of the page, so the
              thanks goes first and the pitch they already answered steps aside. */}
          {justDonated ? (
            <DonationThanks />
          ) : (
            <>
              <p>
                Everything I make here is free and I want to keep it that way, but to do so I need
                your help.
              </p>

              <p>
                If something here made your day a little better, consider supporting me and my work.
                It buys me time to work on the next essay or strange little experiment and would
                mean the world to me.
              </p>

              <DonationCard className="mt-group" />
            </>
          )}

          <h2>Other ways to help</h2>
          <ul>
            <li>
              Send a piece to somebody who'd enjoy it. Spreading the word is a huge help, and it
              doesn't cost a thing.
            </li>
            <li>
              Reply to the newsletter. I read the replies, and some of my favorite conversations
              started from somebody who just wrote back.
            </li>
            <li>
              If you have a website or something cool you made, send it my way, I love seeing what
              other people are up to and get inspired by it.
            </li>
          </ul>

          <p className="mt-sub">Either way, thanks for being here and reading along. 👋🏻</p>
        </article>

        <footer className="mx-auto mt-section max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}
