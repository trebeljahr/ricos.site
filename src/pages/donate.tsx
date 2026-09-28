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
                Everything I make here is free: essays, photos, book notes, odd Three.js demos and
                the newsletter. No paywalls, no ads, and I want to keep it that way.
              </p>

              <p>
                If you&apos;re a friend, or something here made your day a little better, you can
                chip in. It buys me time for the next essay or strange little experiment.
              </p>

              <p>No pressure, though. You&apos;re welcome here either way.</p>

              <DonationCard className="mt-group" />
            </>
          )}

          <h2>Other ways to help</h2>
          <ul>
            <li>
              Send a piece to a friend who&apos;d enjoy it. That&apos;s still the best way anything
              here travels.
            </li>
            <li>
              Reply to the newsletter. I read the replies, and some of my favorite conversations
              started there.
            </li>
            <li>
              Know a publication, podcast or event where my work would fit? Tell me through the{" "}
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
