import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import Link from "next/link";
import { pianoDemos } from "src/lib/pianoDemos";

// Every piano demo, in curriculum order. Development only, like the demos.

export default function PianoDemos() {
  return (
    <Layout
      title="Piano demos"
      description="All piano demos."
      keywords={[]}
      url="piano/demos"
      noindex
    >
      <PageMain>
        <Header title="Piano demos" subtitle="Development only." />
        <ol className="not-prose list-none border-t border-gray-300 p-0 dark:border-gray-700">
          {pianoDemos.map((demo, i) => (
            <li key={demo.slug} className="border-b border-gray-300 dark:border-gray-700">
              <Link
                className="group flex items-baseline gap-stack py-stack transition-colors hover:text-orange-700 dark:hover:text-orange-300"
                href={`/piano/${demo.slug}`}
              >
                <span className="font-mono text-sm text-gray-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong className="text-xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
                  {demo.title}
                </strong>
              </Link>
            </li>
          ))}
        </ol>
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
