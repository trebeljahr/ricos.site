import { ImageWithLoader } from "@components/ImageWithLoader";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

type Cover = { src: string; alt: string };

type Tile = {
  title: string;
  href: string;
  cover: Cover;
  note?: string;
  meta?: string;
};

type Book = { title: string; author: string; href: string; cover: Cover };

type Props = {
  counts: { essays: number; newsletters: number; booknotes: number; travelEntries: number };
  firstReads: Tile[];
  travel: Tile[];
  newsletters: Tile[];
  essays: Tile[];
  books: Book[];
  photos: Tile[];
  making: Tile[];
  rabbitHoles: Tile[];
};

const PORTRAIT: Cover = {
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
    className="group mt-5 inline-flex items-center gap-2 font-semibold text-myBlue no-underline hover:underline"
  >
    {children} <Arrow />
  </Link>
);

const Photo = ({
  cover,
  sizes,
  className,
  priority,
}: {
  cover: Cover;
  sizes: string;
  className?: string;
  priority?: boolean;
}) => (
  // Callers position the frame; a missing "absolute" falls back to "relative"
  // so the filled image always has a positioned parent.
  <div
    className={clsx(
      "overflow-hidden bg-gray-200 dark:bg-gray-800",
      !className?.includes("absolute") && "relative",
      className,
    )}
  >
    <ImageWithLoader
      src={cover.src}
      alt={cover.alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
    />
  </div>
);

const Step = ({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children?: ReactNode;
}) => (
  <div id={id} className="scroll-mt-24 mb-10 flex items-start gap-4 md:gap-6">
    <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-myBlue text-lg font-bold text-white md:h-14 md:w-14 md:text-2xl">
      {number}
    </span>
    <div className="max-w-prose">
      <h2 className="m-0! text-3xl md:text-4xl">{title}</h2>
      {children && (
        <p className="mt-2! mb-0! text-lg! text-gray-600 dark:text-gray-300">{children}</p>
      )}
    </div>
  </div>
);

// One "room" of the site: a short explanation on the left, examples on the right.
const Lane = ({
  kicker,
  title,
  text,
  more,
  children,
}: {
  kicker: string;
  title: string;
  text: ReactNode;
  more: ReactNode;
  children: ReactNode;
}) => (
  <section className="grid gap-6 border-t border-gray-200 py-12 dark:border-gray-800 lg:grid-cols-[17rem_1fr] lg:gap-10">
    <div>
      <p className="m-0! text-sm font-semibold uppercase tracking-widest text-myBlue">{kicker}</p>
      <h3 className="mt-2! mb-0! text-2xl leading-snug">{title}</h3>
      <p className="mt-3! mb-0! text-gray-600 dark:text-gray-300">{text}</p>
      <div className="hidden lg:block">{more}</div>
    </div>
    <div className="min-w-0">
      {children}
      <div className="lg:hidden">{more}</div>
    </div>
  </section>
);

const OverlayTile = ({
  tile,
  className,
  sizes,
  large,
}: {
  tile: Tile;
  className?: string;
  sizes: string;
  large?: boolean;
}) => (
  <Link
    href={tile.href}
    className={clsx(
      "group relative block overflow-hidden rounded-xl text-white no-underline",
      className,
    )}
  >
    <Photo cover={tile.cover} sizes={sizes} className="absolute inset-0" />
    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
      {tile.meta && (
        <p className="m-0! text-xs uppercase tracking-wider text-white/80!">{tile.meta}</p>
      )}
      <p
        className={clsx(
          "m-0! font-bold leading-tight text-white!",
          large ? "text-2xl md:text-3xl" : "text-lg",
        )}
      >
        {tile.title}
      </p>
    </div>
  </Link>
);

const Row = ({ tile }: { tile: Tile }) => (
  <li className="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
    <Link
      href={tile.href}
      className="group grid grid-cols-[5.5rem_1fr] gap-4 py-4 text-inherit no-underline sm:grid-cols-[8rem_1fr] sm:gap-5"
    >
      <Photo cover={tile.cover} sizes="128px" className="aspect-square rounded-lg" />
      <div className="min-w-0 self-center">
        {tile.meta && (
          <p className="m-0! text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {tile.meta}
          </p>
        )}
        <p className="m-0! text-lg! font-semibold leading-snug transition-colors group-hover:text-myBlue">
          {tile.title}
        </p>
        {tile.note && (
          <p className="mt-1! mb-0! text-base! text-gray-600 dark:text-gray-300">{tile.note}</p>
        )}
      </div>
    </Link>
  </li>
);

export default function StartHerePage({
  counts,
  firstReads,
  travel,
  newsletters,
  essays,
  books,
  photos,
  making,
  rabbitHoles,
}: Props) {
  const [lead, ...otherReads] = firstReads;
  const [bigPhoto, ...smallPhotos] = photos;

  return (
    <Layout
      title="Start Here – A Guide to ricos.site"
      description="New here? A short path through ricos.site: the stories to read first, where to go next for travel, essays, booknotes, photography and games, and how to stay in touch."
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
          subtitle="There is a lot on this site. This is the path I'd walk you through."
        />

        <section className="grid items-center gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
          <Photo
            cover={PORTRAIT}
            sizes="(max-width: 768px) calc(100vw - 24px), 400px"
            priority
            className="aspect-4/3 rounded-2xl md:aspect-4/5"
          />
          <div className="[&_p]:text-lg! md:[&_p]:text-xl!">
            <p className="mt-0!">
              Hey, I&apos;m Rico. I travel slowly, read a lot and make games and 3D experiments.
              This website is where all of it ends up.
            </p>
            <p>
              By now that is {counts.essays} essays, {counts.newsletters} newsletters,{" "}
              {counts.travelEntries} travel diary entries and notes on {counts.booknotes} books.
              Nobody needs to read all of that.
            </p>
            <p className="mb-0!">So here is the short version, in three steps:</p>
            <ol className="mt-4! mb-0! list-none space-y-2 pl-0!">
              {[
                ["#first", "Read one story first"],
                ["#deeper", "Go deeper into what you like"],
                ["#stay", "Stay in touch"],
              ].map(([href, label], index) => (
                <li key={href} className="m-0! pl-0!">
                  <a
                    href={href}
                    className="group flex items-center gap-3 font-semibold text-gray-900 no-underline hover:text-myBlue dark:text-gray-100"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-myBlue text-sm text-myBlue">
                      {index + 1}
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-24">
          <Step id="first" number={1} title="Read one story first">
            If you have ten minutes, pick one of these. Each one shows how I write better than a
            description could.
          </Step>

          {lead && (
            <Link
              href={lead.href}
              className="group grid overflow-hidden rounded-2xl border-2 border-gray-200 bg-white text-inherit no-underline shadow-sm transition hover:border-myBlue/50 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[3fr_2fr]"
            >
              <Photo
                cover={lead.cover}
                sizes="(max-width: 768px) calc(100vw - 24px), 600px"
                className="aspect-4/3 md:aspect-auto md:min-h-96"
              />
              <div className="flex flex-col justify-center p-6 md:p-8">
                <p className="m-0! text-sm font-semibold uppercase tracking-widest text-myBlue">
                  {lead.meta}
                </p>
                <p className="mt-2! mb-0! text-3xl font-bold leading-tight transition-colors group-hover:text-myBlue">
                  {lead.title}
                </p>
                <p className="mt-4! mb-0! text-lg text-gray-600 dark:text-gray-300">{lead.note}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-semibold text-myBlue">
                  Start reading <Arrow />
                </span>
              </div>
            </Link>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {otherReads.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="group flex flex-col overflow-hidden rounded-2xl border-2 border-gray-200 bg-white text-inherit no-underline shadow-sm transition hover:border-myBlue/50 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
              >
                <Photo
                  cover={tile.cover}
                  sizes="(max-width: 768px) calc(100vw - 24px), 490px"
                  className="aspect-video"
                />
                <div className="flex grow flex-col p-6">
                  <p className="m-0! text-sm font-semibold uppercase tracking-widest text-myBlue">
                    {tile.meta}
                  </p>
                  <p className="mt-2! mb-0! text-2xl font-bold leading-tight transition-colors group-hover:text-myBlue">
                    {tile.title}
                  </p>
                  <p className="mt-3! mb-0! text-gray-600 dark:text-gray-300">{tile.note}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-28">
          <Step id="deeper" number={2} title="Go deeper into what you like">
            The site has a few big rooms. Here is what is in each one, and where I would begin.
          </Step>

          <Lane
            kicker="Travel"
            title="Travel diaries, one day at a time"
            text="When I travel I write a diary entry for most days and put it here with my photos. Pick a place and read it front to back, like a book."
            more={<MoreLink href="/travel">All travel stories</MoreLink>}
          >
            <div className="grid grid-cols-2 gap-3">
              {travel.map((tile) => (
                <OverlayTile
                  key={tile.href}
                  tile={tile}
                  className="aspect-square sm:aspect-4/3"
                  sizes="(max-width: 1024px) 50vw, 330px"
                />
              ))}
            </div>
          </Lane>

          <Lane
            kicker="Newsletter"
            title="Live and Learn, postcards from wherever I am"
            text="Every few weeks I send a letter with a story from the road, some photos and a few things I found. These are the latest ones."
            more={<MoreLink href="/newsletters">All {counts.newsletters} issues</MoreLink>}
          >
            <ul className="m-0! list-none p-0!">
              {newsletters.map((tile) => (
                <Row key={tile.href} tile={tile} />
              ))}
            </ul>
          </Lane>

          <Lane
            kicker="Essays"
            title="Essays on figuring out how to live"
            text="I write these when a question won't leave me alone. Games, habits, travel and the people I learn from."
            more={<MoreLink href="/posts">All essays</MoreLink>}
          >
            <ul className="m-0! list-none p-0!">
              {essays.map((tile) => (
                <Row key={tile.href} tile={tile} />
              ))}
            </ul>
          </Lane>

          <Lane
            kicker="Booknotes"
            title={`Notes on ${counts.booknotes} books, and the ones I'd read again`}
            text="I write notes on almost every book I finish. I gave all of these 10 out of 10, and the notes go into detail."
            more={<MoreLink href="/booknotes">Search all booknotes</MoreLink>}
          >
            <ul className="m-0! grid list-none grid-cols-3 gap-x-4 gap-y-6 p-0! sm:grid-cols-4">
              {books.map((book) => (
                <li key={book.href} className="m-0! p-0!">
                  <Link href={book.href} className="group block text-inherit no-underline">
                    <Photo
                      cover={book.cover}
                      sizes="(max-width: 640px) 30vw, 160px"
                      className="aspect-2/3 rounded-md shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl"
                    />
                    <p className="mt-2! mb-0! text-sm font-semibold leading-snug group-hover:text-myBlue">
                      {book.title}
                    </p>
                    <p className="m-0! text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Lane>

          <Lane
            kicker="Photography"
            title="Photos from the road"
            text="My favourite frames, sorted into galleries by trip. The best-of gallery is the quickest way in."
            more={<MoreLink href="/photography">All galleries</MoreLink>}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
              {bigPhoto && (
                <OverlayTile
                  tile={bigPhoto}
                  large
                  className="col-span-2 aspect-4/3 md:row-span-2 md:aspect-auto"
                  sizes="(max-width: 768px) 100vw, 340px"
                />
              )}
              {smallPhotos.map((tile) => (
                <OverlayTile
                  key={tile.href}
                  tile={tile}
                  className="aspect-square"
                  sizes="(max-width: 768px) 50vw, 170px"
                />
              ))}
            </div>
          </Lane>

          <Lane
            kicker="Things I make"
            title="Games and 3D scenes you can open right here"
            text="I make games and play around with shaders and Three.js. All of these run in your browser, nothing to install."
            more={
              <div className="flex flex-wrap gap-x-6">
                <MoreLink href="/projects">All projects</MoreLink>
                <MoreLink href="/r3f">3D playground</MoreLink>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {making.map((tile, index) => (
                <OverlayTile
                  key={tile.href}
                  tile={tile}
                  className={clsx(
                    "aspect-video",
                    index < 2
                      ? "col-span-2 sm:col-span-3"
                      : // An odd demo out on phones takes the full row.
                        index === making.length - 1 && making.length % 2 === 1
                        ? "col-span-2"
                        : "col-span-1 sm:col-span-2",
                  )}
                  large={index < 2}
                  sizes={
                    index < 2 ? "(max-width: 640px) 100vw, 330px" : "(max-width: 640px) 50vw, 220px"
                  }
                />
              ))}
            </div>
          </Lane>

          <Lane
            kicker="Rabbit holes"
            title="Small things I got a bit obsessed with"
            text="Not everything here fits a category. These are my favourite odd ones."
            more={null}
          >
            <ul className="m-0! list-none p-0!">
              {rabbitHoles.map((tile) => (
                <Row key={tile.href} tile={tile} />
              ))}
            </ul>
          </Lane>
        </section>

        <section className="mt-20">
          <Step id="stay" number={3} title="Stay in touch">
            If you liked something here, this is how you hear about the next thing.
          </Step>

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
                      <span className="inline-flex items-center gap-2 text-lg font-semibold text-myBlue group-hover:underline">
                        {label} <Arrow />
                      </span>
                      <span className="block text-gray-600 dark:text-gray-300">{note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { byOnlyPublished } = await import("src/lib/utils/filters");
  const { byDate } = await import("src/lib/utils/sorting");
  const { travelingStoriesMetaRaw } = await import("src/pages/travel");
  const { trips } = await import("src/pages/photography");
  const { PROJECTS } = await import("src/lib/projects");
  const { turnKebabIntoTitleCase } = await import("src/lib/utils/turnKebapIntoTitleCase");
  const picks = await import("src/lib/startHere");

  type Entry = {
    title: string;
    slug: string;
    link: string;
    date: string;
    published: boolean;
    cover: Cover;
    metadata?: { readingTime?: number };
    number?: number;
    parentFolder?: string;
    bookAuthor?: string;
  };

  const published = (file: string) => loadVeliteData<Entry[]>(file).filter(byOnlyPublished);
  const posts = published("posts.json");
  const newsletters = published("newsletters.json");
  const booknotes = published("booknotes.json");
  const travelblogs = published("travelblogs.json");

  // Build fails loudly when a pick is renamed or unpublished, instead of
  // silently shipping a start page with a hole in it.
  const find = <T,>(list: T[], match: (item: T) => boolean, label: string): T => {
    const found = list.find(match);
    if (!found) throw new Error(`start-here: no published content for "${label}"`);
    return found;
  };

  const cover = ({ src, alt }: Cover): Cover => ({ src, alt });
  const monthYear = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  // Lane tiles are small, so only the lead card spells out "Travel diary".
  const travelTile = (series: string, note?: string): Tile => {
    const meta = travelingStoriesMetaRaw[series];
    if (!meta) throw new Error(`start-here: no travel meta for "${series}"`);
    const entries = travelblogs.filter((entry) => entry.parentFolder === series).length;
    return {
      title: meta.title,
      href: `/travel/${series}`,
      cover: cover(meta.cover),
      ...(note && { note }),
      meta: note ? `Travel diary · ${entries} entries` : `${entries} entries`,
    };
  };

  const pickTile = ({ kind, id, note }: (typeof picks.FIRST_READS)[number]): Tile => {
    if (kind === "travel") return travelTile(id, note);
    if (kind === "newsletter") {
      const issue = find(newsletters, (entry) => String(entry.number) === id, `newsletter ${id}`);
      return {
        title: issue.title,
        href: issue.link,
        cover: cover(issue.cover),
        note,
        meta: `Newsletter · No. ${issue.number}`,
      };
    }
    const post = find(posts, (entry) => entry.slug === id, `post ${id}`);
    return {
      title: post.title,
      href: post.link,
      cover: cover(post.cover),
      note,
      meta: `Essay · ${post.metadata?.readingTime ?? 1} min read`,
    };
  };

  const firstReads = picks.FIRST_READS.map(pickTile);
  const featured = new Set(firstReads.map(({ href }) => href));

  const latestNewsletters = [...newsletters]
    .sort(byDate)
    .filter(({ link }) => !featured.has(link))
    .slice(0, 3)
    .map((issue) => ({
      title: issue.title,
      href: issue.link,
      cover: cover(issue.cover),
      meta: `No. ${issue.number} · ${monthYear(issue.date)}`,
    }));

  const books = picks.BOOKSHELF.map((slug) => {
    const book = find(booknotes, (entry) => entry.slug === slug, `booknote ${slug}`);
    return {
      title: book.title,
      author: book.bookAuthor ?? "",
      href: book.link,
      cover: cover(book.cover),
    };
  });

  const photos = picks.PHOTO_GALLERIES.map((name) => {
    const trip = find(
      trips,
      (entry) => entry.name === name && Boolean(entry.src),
      `gallery ${name}`,
    );
    return {
      title: name === "best-of" ? "Best of" : turnKebabIntoTitleCase(name),
      href: `/photography/${name}`,
      cover: { src: trip.src, alt: trip.alt },
    };
  });

  const making: Tile[] = [
    ...picks.PROJECT_PICKS.map((slug) => {
      const project = find(PROJECTS, (entry) => entry.slug === slug, `project ${slug}`);
      return {
        title: project.title,
        href: project.link,
        cover: cover(project.cover),
        meta: "Game",
      };
    }),
    ...picks.DEMO_PICKS.map(({ name, title, href }) => ({
      title,
      href,
      cover: { src: `/assets/pages/${name}.png`, alt: `Preview of the ${title} 3D scene` },
      meta: "3D scene",
    })),
  ];

  return {
    props: {
      counts: {
        essays: posts.length,
        newsletters: newsletters.length,
        booknotes: booknotes.length,
        travelEntries: travelblogs.length,
      },
      firstReads,
      travel: picks.TRAVEL_SERIES.filter((series) => !featured.has(`/travel/${series}`)).map(
        (series) => travelTile(series),
      ),
      newsletters: latestNewsletters,
      essays: picks.ESSAYS.map(pickTile).map((tile) => ({
        ...tile,
        meta: tile.meta?.replace("Essay · ", ""),
      })),
      books,
      photos,
      making,
      rabbitHoles: picks.RABBIT_HOLES,
    },
  };
};
