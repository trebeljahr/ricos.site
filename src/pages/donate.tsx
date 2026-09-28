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
                All things I make here are free: essays, photos, notes, weird Three.js demos, the
                newsletter. I like it that way. No paywalls, no ads, no tracking circus. I want this
                place to stay open and human.
              </p>

              <p>
                No pressure, obviously. The whole point of this place is that you can wander around
                without having to pay, ever. I hate ads, so there won&apos;t be any here either.
              </p>

              <p>
                The ethos is to run this as a passion project. Something I love doing because I
                think it provides a little value to the world. Donations are a way of feeding the
                project without changing what it is. They let me keep the lights on, keep the ads
                out, and make room for the next thing.
              </p>

              <DonationCard className="mt-group" />
            </>
          )}

          <h2>Other ways to help</h2>
          <p>Money is nice, but it is not the only useful thing.</p>
          <ul>
            <li>
              Send a piece to a friend who would actually enjoy it. That is still the best kind of
              distribution.
            </li>
            <li>
              Reply to the newsletter. I read those, and some of my favorite conversations started
              that way.
            </li>
            <li>
              If you run a publication, podcast, event, or just know a place where this work would
              fit, reach out. Contact info is on the{" "}
              <a href="/imprint" className="text-accent hover:underline">
                imprint
              </a>{" "}
              page.
            </li>
          </ul>

          <p className="mt-sub">Thanks for being here and reading along. 🌱</p>
        </article>

        <footer className="mx-auto mt-section max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}
