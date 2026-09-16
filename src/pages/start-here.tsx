import { Card, type CardCover } from "@components/Card";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

type Tile = {
  title: string;
  href: string;
  cover: CardCover;
  note: string;
};

type Props = {
  bestOfPhotos: CardCover[];
  demos: Tile[];
  rabbitHoles: Tile[];
};

const PORTRAIT: CardCover = {
  src: "/assets/photography/transat/me-steering-the-boat-smiling-happily.jpg",
  alt: "Rico steering a sailboat in the middle of the Atlantic and smiling",
};

const Arrow = () => (
  <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
    →
  </span>
);

const MoreLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link
    href={href}
    className="group mt-6 inline-flex items-center gap-2 font-semibold text-accent no-underline hover:underline"
  >
    {children} <Arrow />
  </Link>
);

const Section = ({
  kicker,
  title,
  text,
  children,
}: {
  kicker: string;
  title: string;
  text: ReactNode;
  children: ReactNode;
}) => (
  <section className="mt-24">
    <div className="mb-8 max-w-prose">
      <p className="m-0! text-sm font-semibold uppercase tracking-widest text-accent">{kicker}</p>
      <h2 className="mt-2! mb-0! text-3xl md:text-4xl">{title}</h2>
      <p className="mt-3! mb-0! text-lg! text-gray-600 dark:text-gray-300">{text}</p>
    </div>
    {children}
  </section>
);

export default function StartHerePage({ bestOfPhotos, demos, rabbitHoles }: Props) {
  return (
    <Layout
      title="Start Here – A Guide to ricos.site"
      description="New here? A few things that show what ricos.site is about: travel photography, 3D scenes you can play with, some odd side projects, and the newsletter."
      url="start-here"
      image={PORTRAIT.src}
      imageAlt={PORTRAIT.alt}
      keywords={["start here", "best of", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Start Here", url: "/start-here" },
        ]}
      />
      <main className="mx-auto max-w-5xl px-3 pt-5 pb-24">
        <Header
          breadcrumbs={{ path: "start-here" }}
          title="Start Here"
          subtitle="A few things that show what this site is about."
        />

        <section className="grid items-center gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 md:aspect-4/5">
            <ImageWithLoader
              src={PORTRAIT.src}
              alt={PORTRAIT.alt}
              fill
              sizes="(max-width: 768px) calc(100vw - 24px), 400px"
              priority
              className="object-cover"
            />
          </div>
          <div className="[&_p]:text-lg! md:[&_p]:text-xl!">
            <p className="mt-0!">
              Hey, I&apos;m Rico. I travel slowly, read a lot and make games and 3D experiments.
              This website is where all of it ends up.
            </p>
            <p className="mb-0!">
              Over the years it grew into a lot of pages. You don&apos;t need to see all of them.
              Scroll down for a small taste instead, and if you like it, stay in touch.
            </p>
          </div>
        </section>

        <Section
          kicker="Photography"
          title="Photos from the road"
          text="My favourite frames from every trip, collected in one gallery."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
            {bestOfPhotos.map((cover, index) => (
              // Each photo is its own link and hover group, so only the one
              // under the cursor zooms. "isolate" keeps the scaled image
              // clipped to the rounded corners in Safari.
              <Link
                key={cover.src}
                href="/photography/best-of"
                aria-label={index === 0 ? "Open the best-of gallery" : undefined}
                tabIndex={index === 0 ? undefined : -1}
                className={clsx(
                  "group relative isolate block overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800",
                  index === 0
                    ? "col-span-2 aspect-4/3 md:row-span-2 md:aspect-auto"
                    : "aspect-square",
                )}
              >
                <ImageWithLoader
                  src={cover.src}
                  alt={cover.alt}
                  fill
                  sizes={
                    index === 0
                      ? "(max-width: 768px) calc(100vw - 24px), 490px"
                      : "(max-width: 768px) 50vw, 240px"
                  }
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
                />
              </Link>
            ))}
          </div>
          <MoreLink href="/photography/best-of">Open the best-of gallery</MoreLink>
        </Section>

        <Section
          kicker="3D"
          title="Scenes you can play with"
          text="I build 3D scenes with shaders and Three.js. Both of these run right here in your browser."
        >
          <div className="grid gap-6 md:grid-cols-2">
            {demos.map((tile) => (
              <Card
                key={tile.href}
                link={tile.href}
                title={tile.title}
                excerpt={tile.note}
                cover={tile.cover}
                coverAspect="video"
                headingAs="h3"
                sizes="(max-width: 768px) calc(100vw - 24px), 490px"
              />
            ))}
          </div>
          <MoreLink href="/r3f">More in the 3D playground</MoreLink>
        </Section>

        <Section
          kicker="Rabbit holes"
          title="Small things I got a bit obsessed with"
          text="Not everything here fits a category. These are my favourite odd ones."
        >
          <div className="grid gap-6 sm:grid-cols-3">
            {rabbitHoles.map((tile) => (
              <Card
                key={tile.href}
                link={tile.href}
                title={tile.title}
                excerpt={tile.note}
                cover={tile.cover}
                headingAs="h3"
                sizes="(max-width: 640px) calc(100vw - 24px), 320px"
              />
            ))}
          </div>
        </Section>

        <Section
          kicker="Stay in touch"
          title="If you liked any of this"
          text="This is how you hear about the next thing."
        >
          <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
            <div className="[&>div]:mt-0!">
              <NewsletterForm
                heading={<h3 className="mt-0! text-2xl">Get Live and Learn by email</h3>}
                text={
                  <p className="mb-4">
                    One postcard every few weeks. A story from wherever I am, photos and a few
                    things I found. No ads, and you can unsubscribe with one click.
                  </p>
                }
              />
            </div>
            <div>
              <h3 className="mt-0! text-2xl">Get to know me</h3>
              <ul className="m-0! list-none space-y-4 p-0!">
                {[
                  ["/now", "Now", "What I'm doing right now."],
                  ["/principles", "Principles", "The rules I try to live by."],
                  ["/timeline", "Timeline", "Everything on this site, newest first."],
                  ["/rss.xml", "RSS feed", "For feed readers. Everything new, nothing else."],
                ].map(([href, label, note]) => (
                  <li key={href} className="m-0! p-0!">
                    <Link href={href} className="group block text-inherit no-underline">
                      <span className="inline-flex items-center gap-2 text-lg font-semibold text-accent group-hover:underline">
                        {label} <Arrow />
                      </span>
                      <span className="block text-gray-600 dark:text-gray-300">{note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </main>
    </Layout>
  );
}

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { trips } = await import("src/pages/photography");
  const { BEST_OF_PHOTOS, DEMO_PICKS, RABBIT_HOLES } = await import("src/lib/startHere");

  // Build fails loudly when a pick is renamed, instead of shipping a hole.
  const bestOfPhotos = BEST_OF_PHOTOS.map((name) => {
    const trip = trips.find((entry) => entry.name === name && entry.src);
    if (!trip) throw new Error(`start-here: no cover photo for gallery "${name}"`);
    return { src: trip.src, alt: trip.alt };
  });

  const demos = DEMO_PICKS.map(({ name, title, href, note }) => ({
    title,
    href,
    note,
    cover: { src: `/assets/pages/${name}.png`, alt: `Preview of the ${title} 3D scene` },
  }));

  return { props: { bestOfPhotos, demos, rabbitHoles: RABBIT_HOLES } };
};
