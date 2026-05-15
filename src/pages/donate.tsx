import { BreadCrumbs } from "@components/BreadCrumbs";
import { DonationCard } from "@components/DonationCard";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";

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
            All things I make here are free: essays, photos, notes, weird Three.js demos, the
            newsletter. I like it that way. No paywalls, no ads, no tracking circus. I want this
            place to stay open and human.
          </p>

          <p>
            No pressure, obviously. The whole point of this place is that you can wander around
            without having to pay, ever. I hate ads, so there won&apos;t be any here either.
          </p>

          <p>
            The ethos is to run this as a passion project. Something I love doing because I think it
            provides a little value to the world. Donations are a way of feeding the project without
            changing what it is. They let me keep the lights on, keep the ads out, and make room for
            the next thing.
          </p>

          <DonationCard className="mt-8" />

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
