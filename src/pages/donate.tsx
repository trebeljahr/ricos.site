import { BreadCrumbs } from "@components/BreadCrumbs";
import { ExternalLink } from "@components/ExternalLink";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";

const platforms = [
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/trebeljahr",
    blurb:
      "Simple one-off tip jar. Buy me a coffee or, realistically, a flat white. No account needed.",
  },
  {
    name: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/trebeljahr",
    blurb: "Same idea, different button. Use whichever one already feels least annoying.",
  },
  {
    name: "Patreon",
    url: "https://www.patreon.com/RicoTrebeljahr",
    blurb:
      "Monthly support if you want to help make room for more essays, code experiments, photos, and newsletters.",
  },
];

export default function DonatePage() {
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
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose prose dark:prose-invert">
          <BreadCrumbs path="donate" />
          <h1 className="text-4xl mt-16!">Donate</h1>

          <p>
            Most things I make here are free: essays, photos, notes, weird Three.js demos, the
            newsletter. I like it that way. If you got something out of this site and feel like
            sending a few euros back, that helps me buy time to make the next thing.
          </p>

          <p>
            No pressure, obviously. The whole point of this place is that you can wander around
            without having to pay first.
          </p>

          <ul className="not-prose mt-8 flex flex-col gap-4">
            {platforms.map((p) => (
              <li
                key={p.name}
                className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 transition-transform hover:scale-[1.01] hover:border-myBlue"
              >
                <ExternalLink href={p.url} className="block no-underline text-inherit">
                  <h2 className="text-xl font-bold m-0">{p.name}</h2>
                  <p className="mt-2 mb-0">{p.blurb}</p>
                </ExternalLink>
              </li>
            ))}
          </ul>

          <h2 className="mt-12">Other ways to help</h2>
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
              <a href="/imprint" className="text-myBlue hover:underline">
                imprint
              </a>{" "}
              page.
            </li>
          </ul>

          <p className="mt-10">Thanks for being here and reading along. 🌱</p>
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}
