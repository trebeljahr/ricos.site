import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Link from "next/link";

const sections = [
  {
    title: "Creative Coding",
    description:
      "Interactive 3D experiments built with React Three Fiber and WebGL.",
    links: [
      {
        href: "/r3f/scenes/plasma-ball",
        label: "Plasma Ball",
        note: "A mesmerizing 3D lightning plasma ball effect",
      },
      {
        href: "/r3f/scenes/shader-editor",
        label: "Shader Editor",
        note: "Write and preview GLSL shaders in real-time",
      },
      {
        href: "/r3f/scenes/ocean",
        label: "Underwater Ocean",
        note: "A 3D underwater scene with fishes and lighting",
      },
      {
        href: "/r3f",
        label: "All R3F Demos",
        note: "Browse all 30+ interactive 3D experiments",
      },
    ],
  },
  {
    title: "Writing",
    description: "Essays on science, philosophy, programming, and life.",
    links: [
      {
        href: "/posts/diatoms",
        label: "Diatoms",
        note: "The invisible glass architects of the ocean",
      },
      {
        href: "/posts/collision-detection",
        label: "Collision Detection in 2D",
        note: "An interactive guide with live demos",
      },
      {
        href: "/posts/vectors-101",
        label: "Vectors 101",
        note: "Everything you need to know about vectors",
      },
      {
        href: "/posts",
        label: "All Posts",
        note: "Browse the full archive",
      },
    ],
  },
  {
    title: "Photography",
    description:
      "Travel photography from journeys across Asia, Europe, the Caribbean, and South America.",
    links: [
      {
        href: "/photography/best-of",
        label: "Best Of",
        note: "A curated selection of my favorite shots",
      },
      {
        href: "/photography",
        label: "All Photography",
        note: "Browse by trip and destination",
      },
    ],
  },
  {
    title: "Newsletter",
    description:
      "Live and Learn — a bi-weekly newsletter about AI, science, and things worth sharing.",
    links: [
      {
        href: "/newsletters",
        label: "Newsletter Archive",
        note: "All past editions",
      },
    ],
  },
  {
    title: "Book Notes",
    description:
      "Summaries and notes from 100+ books on science, philosophy, business, and self-improvement.",
    links: [
      {
        href: "/booknotes",
        label: "All Book Notes",
        note: "Search, filter, and browse the full library",
      },
    ],
  },
  {
    title: "Travel Stories",
    description:
      "Long-form stories from backpacking, cycling, and sailing around the world.",
    links: [
      {
        href: "/travel",
        label: "All Travel Stories",
        note: "From Indonesia to South America and everything in between",
      },
    ],
  },
  {
    title: "About Me",
    description: "The pages that show who I am and what I care about.",
    links: [
      {
        href: "/principles",
        label: "Principles",
        note: "The values and ideas I try to live by",
      },
      {
        href: "/needlestack",
        label: "Needlestack",
        note: "The best things I've found on the internet",
      },
      {
        href: "/now",
        label: "Now",
        note: "What I'm currently up to",
      },
    ],
  },
];

export default function StartHerePage() {
  return (
    <Layout
      title="Start Here – A Guide to ricos.site"
      description="New here? This is a curated guide to the best content on ricos.site — creative coding experiments, essays, photography, book notes, travel stories, and more."
      url="start-here"
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      imageAlt="a person reading a book, while floating in space"
      keywords={[
        "start here",
        "best of",
        "guide",
        "Rico Trebeljahr",
        "programming",
        "photography",
        "writing",
        "travel",
      ]}
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
            Welcome! This site is a collection of things I create, learn, and
            care about. Here&apos;s a guide to help you find what interests you.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="mb-12">
              <h2 className="text-2xl mb-2">{section.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {section.description}
              </p>
              <ul className="space-y-3 list-none pl-0!">
                {section.links.map((link) => (
                  <li key={link.href} className="pl-0!">
                    <Link
                      href={link.href}
                      className="text-myBlue hover:underline font-medium"
                    >
                      {link.label}
                    </Link>
                    {link.note && (
                      <span className="text-gray-500 dark:text-gray-500 ml-2">
                        — {link.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl mb-4">Stay in Touch</h2>
            <p className="mb-4">
              The best way to follow along is through my newsletter, Live and
              Learn. It comes out every two weeks with the most interesting
              things I&apos;ve found and created.
            </p>
            <NewsletterForm />
          </section>
        </article>
      </main>
    </Layout>
  );
}
