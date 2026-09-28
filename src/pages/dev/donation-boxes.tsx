import { DonationCard, DonationStrip, DonationThanks } from "@components/DonationCard";
import { DonationSourceHeader, donationBrandStyle } from "@components/DonationSourceHeader";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import { type ReactNode, useState } from "react";
import { getDonationSource, SOURCE_BRANDS } from "src/lib/donationSources";

// A dev-only gallery of every donation surface, so the boxes can be compared
// side by side without hunting across /donate, a long post and the footer.
// getStaticProps returns notFound in production, so this never ships live.

type FrameProps = { label: string; children: ReactNode };

// Two copies of one variant: the left follows the site theme, the right is
// forced dark. Set the site to light mode (theme toggle, top right) to read
// the left column as true light.
function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-section">
      <h2 className="mb-label text-lg font-bold text-gray-900 dark:text-white">{label}</h2>
      <div className="grid gap-para lg:grid-cols-2">
        <Frame label="Site theme">{children}</Frame>
        <div className="dark">
          <Frame label="Dark">{children}</Frame>
        </div>
      </div>
    </section>
  );
}

function Frame({ label, children }: FrameProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-950">
      <p className="mb-label text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      {children}
    </div>
  );
}

// Every project that links to /donate?from=<slug>, in its own colours, so the
// whole set can be checked at once. Chemistry Sketcher has no brand of its own.
const sourceSlugs = [...Object.keys(SOURCE_BRANDS), "chemistry-sketcher"];

function SourceHeaders() {
  return (
    <div className="grid gap-stack">
      {sourceSlugs.map((slug) => {
        const source = getDonationSource(slug);
        if (!source) return null;
        return (
          <div
            key={slug}
            className={clsx(source.brand && "donation-brand")}
            style={source.brand ? donationBrandStyle(source.brand) : undefined}
          >
            <DonationSourceHeader source={source} />
          </div>
        );
      })}
    </div>
  );
}

// A standalone copy of the footer line, so it can be seen without the footer.
function FooterLine() {
  return (
    <span className="text-sm text-gray-600 hover:text-accent dark:text-gray-400">
      Reader-funded. No ads.
    </span>
  );
}

export default function DonationBoxesDevPage() {
  // Bumping the key remounts both thanks cards, which replays the animation.
  const [thanksRun, setThanksRun] = useState(0);

  return (
    <Layout
      title="Donation boxes (dev)"
      description="A dev-only gallery of every donation surface on the site."
      url="dev/donation-boxes"
      keywords={["dev"]}
      noindex
    >
      <PageMain>
        <article className="mx-auto max-w-5xl">
          <Header
            breadcrumbs={{ path: "dev/donation-boxes" }}
            title="Donation boxes"
            subtitle="Dev-only gallery of every donation surface"
          />
          <p className="max-w-prose text-gray-700 dark:text-gray-200">
            Every donation box in one place. Stripe tiles only appear when the
            NEXT_PUBLIC_STRIPE_DONATION_* env vars are set; otherwise the fallback links show. Set
            the site to light mode to read the left column as true light.
          </p>

          <Pair label="Full card — /donate">
            <DonationCard />
          </Pair>

          <Pair label="Post strip — under long posts">
            <DonationStrip />
          </Pair>

          <Pair label="Thanks state — /donate?thanks=1">
            <DonationThanks key={thanksRun} />
          </Pair>

          <Pair label="Thanks state — donor came from a project (/donate?from=fractal-garden)">
            <DonationThanks
              key={thanksRun}
              backTo={{ name: "Fractal Garden", href: "https://fractal.garden/?supported=1" }}
            />
          </Pair>
          <button
            type="button"
            className="mt-label rounded-md border-2 border-gray-200 px-4 py-2 text-sm font-semibold transition-colors hover:border-accent dark:border-gray-700"
            onClick={() => setThanksRun((run) => run + 1)}
          >
            Replay thanks animation
          </button>

          <Pair label="Source headers — /donate?from=<slug>">
            <SourceHeaders />
          </Pair>

          <Pair label="Footer line — every page">
            <FooterLine />
          </Pair>
        </article>
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true } as const;
  }
  return { props: {} };
}
