import clsx from "clsx";
import { ExternalLink } from "./ExternalLink";

const donationLinks = [
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/trebeljahr",
    blurb: "One-time tip jar. Buy me a coffee or, realistically, a flat white.",
  },
  {
    name: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/trebeljahr",
    blurb: "Same idea, different button. Use whichever one already feels least annoying.",
  },
  {
    name: "Patreon",
    url: "https://www.patreon.com/RicoTrebeljahr",
    blurb: "Monthly donation if you want to make this a little more sustainable.",
  },
];

type DonationCardProps = {
  className?: string;
};

export function DonationCard({ className }: DonationCardProps) {
  return (
    <section className={clsx("not-prose w-full", className)} aria-labelledby="donation-card-title">
      <div className="rounded-lg border-4 border-gray-200 bg-white px-5 py-10 dark:border-gray-700 dark:bg-gray-800">
        <p className="m-0 text-sm font-semibold text-myBlue">donating = loving</p>
        <h2 id="donation-card-title" className="mt-2 mb-3 text-2xl font-bold">
          Keep this place alive
        </h2>
        <p className="m-0 max-w-prose text-gray-700 dark:text-gray-200">
          This is a small labor of love, made because I like making useful and beautiful things for
          the internet. If it made your day a little better, a donation is one way to say: keep
          going.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {donationLinks.map((link) => (
            <ExternalLink
              key={link.name}
              href={link.url}
              className="inline-flex min-h-14 flex-1 basis-48 flex-col justify-center rounded-md border-2 border-gray-200 px-4 py-3 no-underline transition-colors hover:border-myBlue dark:border-gray-700"
            >
              <span className="font-bold text-gray-900 dark:text-white">{link.name}</span>
              <span className="mt-1 text-sm text-gray-600 dark:text-gray-300">{link.blurb}</span>
            </ExternalLink>
          ))}
        </div>
      </div>
    </section>
  );
}
