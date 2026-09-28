import { DonationCard, DonationThanks, useDonationSupportedAt } from "@components/DonationCard";
import { ExternalLink } from "@components/ExternalLink";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  DONATION_SOURCE_STORAGE_KEY,
  FROM_QUERY_KEY,
  isFreshSource,
  manageDonationUrl,
  type StoredDonationSource,
  supportedUrl,
  THANKS_QUERY_KEY,
} from "src/lib/donation";
import { getDonationSource } from "src/lib/donationSources";
import useLocalStorageState from "use-local-storage-state";

export default function DonatePage() {
  // Stripe sends donors back here with ?thanks=1 (set per Payment Link in the
  // dashboard). Remember the moment so the inline asks stay quiet for a while.
  const router = useRouter();
  const justDonated = router.isReady && router.query[THANKS_QUERY_KEY] !== undefined;
  const [, setSupportedAt] = useDonationSupportedAt();

  // Other projects link here as /donate?from=<slug>. An unknown slug reads as
  // no slug, so the page falls back to the ricos.site copy.
  const source = router.isReady ? getDonationSource(router.query[FROM_QUERY_KEY]) : null;
  const sourceSlug = source?.slug;
  const [storedSource, setStoredSource] = useLocalStorageState<StoredDonationSource | null>(
    DONATION_SOURCE_STORAGE_KEY,
    { defaultValue: null },
  );

  useEffect(() => {
    if (!router.isReady) return;
    if (justDonated) {
      setSupportedAt(Date.now());
      return;
    }
    // Every other visit overwrites the slug, so a donation that starts on
    // ricos.site never offers a way back to a project seen earlier.
    setStoredSource(sourceSlug ? { slug: sourceSlug, at: Date.now() } : null);
  }, [router.isReady, justDonated, sourceSlug, setSupportedAt, setStoredSource]);

  const cameFrom =
    justDonated && isFreshSource(storedSource) ? getDonationSource(storedSource?.slug) : null;
  const backTo = cameFrom?.url
    ? { name: cameFrom.name, href: supportedUrl(cameFrom.url) }
    : undefined;

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
            <DonationThanks backTo={backTo} />
          ) : (
            <>
              {source ? (
                <p>
                  Thanks for coming over from {source.name}! If it was useful to you or made your
                  day a little better, consider supporting me and my work. It buys me time to keep
                  improving it and to build the next thing.
                </p>
              ) : (
                <>
                  <p>
                    Everything I make here is free and I want to keep it that way, but to do so I
                    need your help.
                  </p>

                  <p>
                    If something here made your day a little better, consider supporting me and my
                    work. It buys me time to work on the next essay or strange little experiment and
                    would mean the world to me.
                  </p>
                </>
              )}

              <DonationCard className="mt-group" reference={source?.slug} />
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
          {/* Always here, so a monthly donor can find the way out without hunting. */}
          {manageDonationUrl && (
            <p className="mt-group mb-0 text-center text-sm text-gray-600 dark:text-gray-400">
              <ExternalLink href={manageDonationUrl} className="hover:text-accent">
                Manage your donation
              </ExternalLink>
            </p>
          )}
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}
