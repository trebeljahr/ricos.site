import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Link from "next/link";

const highlights = [
  {
    href: "/diatoms",
    label: "Diatom Arrangements",
    note: "A glimpse into the invisible world of microscopic algae art",
  },
  {
    href: "/photos",
    label: "Photography",
    note: "15 years of photography distilled into a single gallery.",
  },
  {
    href: "/plasma",
    label: "Plasma Ball",
    note: "A mesmerizing 3D plasma ball.",
  },
  {
    href: "/shader-art",
    label: "Shader Art",
    note: "Fractal patterns to play around and make art with.",
  },
  {
    href: "/needles",
    label: "Needlestack",
    note: "The best things I've found on the internet. Period.",
  },
  {
    href: "/newsletters",
    label: "Live and Learn",
    note: "Digital postcards, filled with a mix of travel stories and beautiful things I've found.",
  },
  {
    href: "/yellow",
    label: "The Best Yellow",
    note: "A whimsical exploration of which is the best yellow available on Amazon.",
  },
  {
    href: "/principles",
    label: "Principles",
    note: "Things that I try to live by, and want to remember.",
  },
];

export default function StartHerePage() {
  return (
    <Layout
      title="Start Here – A Guide to ricos.site"
      description="New here? Here are the best things on ricos.site — essays, photography, creative coding, and a newsletter worth reading."
      url="start-here"
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      imageAlt="a person reading a book, while floating in space"
      keywords={["start here", "best of", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Start Here", url: "/start-here" },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <h1 className="text-4xl mt-16!">Start Here</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
            New here? These are the things I&apos;m most proud of.
          </p>

          <div className="space-y-6">
            {highlights.map((item) => (
              <div key={item.href}>
                <Link href={item.href} className="text-xl text-myBlue hover:underline font-medium">
                  {item.label}
                </Link>
                <p className="text-gray-500 dark:text-gray-400 mt-0! mb-0!">{item.note}</p>
              </div>
            ))}
          </div>

          <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl mb-4">Stay in Touch</h2>
            <p className="mb-4">
              The best way to follow along is through my newsletter, Live and Learn. It comes out
              every two weeks.
            </p>
            <NewsletterForm />
          </section>
        </article>
      </main>
    </Layout>
  );
}
