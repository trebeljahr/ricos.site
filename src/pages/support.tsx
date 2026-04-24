import { BreadCrumbs } from "@components/BreadCrumbs";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { ExternalLink } from "@components/ExternalLink";

const platforms = [
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/trebeljahr",
    blurb:
      "One-off tip jar. Buy me a coffee (or, realistically, a flat white)—no account required.",
  },
  {
    name: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/trebeljahr",
    blurb:
      "Same deal, different platform. Pick whichever you already have an account with.",
  },
  {
    name: "Patreon",
    url: "https://www.patreon.com/RicoTrebeljahr",
    blurb:
      "Monthly support if you'd like to keep the essays, code, and photography coming on a regular cadence.",
  },
];

export default function SupportPage() {
  return (
    <Layout
      title="Support my work – ricos.site"
      description="If the writing, photography, or open-source experiments here have been useful to you, here's how to throw a few euros my way."
      url="support"
      keywords={[
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
          { name: "Support", url: "/support" },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose prose dark:prose-invert">
          <BreadCrumbs path="support" />
          <h1 className="text-4xl mt-16!">Support my work</h1>

          <p>
            Everything on this site — essays, photography, open-source
            experiments, the newsletter — is free and stays that way. If some
            of it has been useful to you and you'd like to help keep it going,
            these are the easiest ways:
          </p>

          <ul className="not-prose mt-8 flex flex-col gap-4">
            {platforms.map((p) => (
              <li
                key={p.name}
                className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 transition-transform hover:scale-[1.01] hover:border-myBlue"
              >
                <ExternalLink
                  href={p.url}
                  className="block no-underline text-inherit"
                >
                  <h2 className="text-xl font-bold m-0">{p.name}</h2>
                  <p className="mt-2 mb-0">{p.blurb}</p>
                </ExternalLink>
              </li>
            ))}
          </ul>

          <h2 className="mt-12">Non-monetary ways to help</h2>
          <p>Free things that also move the needle:</p>
          <ul>
            <li>
              Share a piece you liked with someone who'd enjoy it — that's how
              the little audience here got built in the first place.
            </li>
            <li>
              Reply to the newsletter. I read every reply and the best
              conversations I've had about this stuff started there.
            </li>
            <li>
              If you run a publication, podcast, or event and think I'd have
              something to contribute, reach out. Contact info is on the{" "}
              <a href="/imprint" className="text-myBlue hover:underline">
                imprint
              </a>{" "}
              page.
            </li>
          </ul>

          <p className="mt-10">Thanks for being here. 🌱</p>
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}
