import { DonationCard, DonationThanks, useDonationSupportedAt } from "@components/DonationCard";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ProjectDonationPage } from "@components/ProjectDonationPage";
import { ToTopButton } from "@components/ToTopButton";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  DONATION_SOURCE_STORAGE_KEY,
  FROM_QUERY_KEY,
  isFreshSource,
  SOURCE_TTL_MS,
  type StoredDonationSource,
  THANKS_QUERY_KEY,
} from "src/lib/donation";
import {
  DONATION_SOURCE_COOKIE,
  donationPath,
  donationReturnForVisit,
  donationSourceFromCookie,
  RETURN_QUERY_KEY,
  sourceFromReferrer,
  validateDonationReturn,
} from "src/lib/donationNavigation";
import { getDonationRedirect, getDonationSource } from "src/lib/donationSources";
import useLocalStorageState from "use-local-storage-state";

export type DonatePageProps = {
  initialSourceSlug: string | null;
  initialThanks: boolean;
  initialReturnTo: string | null;
};

export default function DonatePage({
  initialSourceSlug,
  initialThanks,
  initialReturnTo,
}: DonatePageProps) {
  // Stripe sends donors back here with ?thanks=1 (set per Payment Link in the
  // dashboard). Remember the moment so the inline asks stay quiet for a while.
  const router = useRouter();
  const justDonated = router.isReady ? router.query[THANKS_QUERY_KEY] !== undefined : initialThanks;
  const [, setSupportedAt] = useDonationSupportedAt();

  // Other projects link here as /donate?from=<slug>. An unknown slug reads as
  // no slug, so the page falls back to the ricos.site copy.
  const source = getDonationSource(
    router.isReady
      ? (router.query.project ?? router.query[FROM_QUERY_KEY] ?? initialSourceSlug)
      : initialSourceSlug,
  );
  const sourceSlug = source?.slug;
  const returnCandidate =
    (router.isReady ? router.query[RETURN_QUERY_KEY] : null) ?? initialReturnTo;
  const validatedReturn = source ? validateDonationReturn(source, returnCandidate) : null;
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
    try {
      // biome-ignore lint/suspicious/noDocumentCookie: Synchronous fallback supported in browsers without Cookie Store.
      document.cookie = `${DONATION_SOURCE_COOKIE}=${sourceSlug ? encodeURIComponent(sourceSlug) : ""}; Path=/donate; Max-Age=${sourceSlug ? SOURCE_TTL_MS / 1000 : 0}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      // Storage restrictions must not prevent a donation or the return link.
    }
    // Every other visit overwrites the slug, so a donation that starts on
    // ricos.site never offers a way back to a project seen earlier.
    setStoredSource(
      sourceSlug
        ? { slug: sourceSlug, at: Date.now(), returnTo: validatedReturn ?? undefined }
        : null,
    );
  }, [router.isReady, justDonated, sourceSlug, validatedReturn, setSupportedAt, setStoredSource]);

  const cameFrom = justDonated
    ? (source ?? (isFreshSource(storedSource) ? getDonationSource(storedSource?.slug) : null))
    : null;
  const activeSource = justDonated ? cameFrom : source;
  if (activeSource) {
    return (
      <ProjectDonationPage
        source={activeSource}
        justDonated={justDonated}
        returnTo={donationReturnForVisit(activeSource, returnCandidate, storedSource, justDonated)}
      />
    );
  }

  return (
    <Layout
      title="Buy me a coffee – ricos.site"
      description="If something here was useful or made your day a little better, you can buy me a coffee."
      url="donate"
      keywords={[
        "buy me a coffee",
        "donate",
        "support",
        "ko-fi",
        "patreon",
        "sponsor",
        "Rico Trebeljahr",
      ]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Buy me a coffee", url: "/donate" },
        ]}
      />
      <PageMain>
        <article className="mx-auto max-w-prose prose md:prose-lg xl:prose-xl dark:prose-invert">
          <Header
            breadcrumbs={{
              path: "donate",
              overwrites: [{ matchingPath: "donate", newText: "buy-me-a-coffee" }],
            }}
            title="Support me creating this work"
          />

          {/* A donor coming back from Stripe lands at the top of the page, so the
              thanks goes first and the pitch they already answered steps aside. */}
          {justDonated ? (
            <DonationThanks />
          ) : (
            <>
              <p>
                Everything I make here is free, and I want to keep it that way. Most of it gets
                written with a coffee next to me.
              </p>

              <p>
                If something here made your day a little better, you can buy me one. It buys me time
                for the next essay or strange little experiment, and it would mean the world to me.
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

// Resolve explicit referrals on the server so the first paint already belongs
// to the project. Checkout returns without a slug recover it after hydration.
export const getServerSideProps: GetServerSideProps<DonatePageProps> = async ({ query, req }) => {
  const destination = getDonationRedirect(query[FROM_QUERY_KEY]);
  if (destination) return { redirect: { destination, permanent: false } };
  const source =
    getDonationSource(query[FROM_QUERY_KEY]) ??
    (query[THANKS_QUERY_KEY] !== undefined ? donationSourceFromCookie(req.headers.cookie) : null) ??
    (query[FROM_QUERY_KEY] === undefined && query[THANKS_QUERY_KEY] === undefined
      ? sourceFromReferrer(req.headers.referer)
      : null);
  if (source) {
    const params = new URLSearchParams();
    const returnTo =
      validateDonationReturn(source, query[RETURN_QUERY_KEY]) ??
      validateDonationReturn(source, req.headers.referer);
    if (returnTo) params.set(RETURN_QUERY_KEY, returnTo);
    if (query[THANKS_QUERY_KEY] !== undefined) params.set(THANKS_QUERY_KEY, "1");
    return {
      redirect: {
        destination: `${donationPath(source.slug)}${params.size ? `?${params}` : ""}`,
        permanent: false,
      },
    };
  }
  return {
    props: {
      initialSourceSlug: null,
      initialThanks: query[THANKS_QUERY_KEY] !== undefined,
      initialReturnTo: null,
    },
  };
};
