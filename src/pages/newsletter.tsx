import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import Link from "next/link";
import { NEWSLETTER_LISTS, offeredListKeys } from "src/lib/newsletter/lists";

const url = "newsletter";

export default function Newsletter() {
  // Fixed at build time, so the server render and the browser agree.
  const lists = offeredListKeys();

  return (
    <Layout
      title="Newsletters"
      description="The mailing lists you can join on ricos.site, what each one sends and how often."
      url={url}
      keywords={["newsletter", "live and learn", "email", "subscribe"]}
    >
      <PageMain>
        <Header
          breadcrumbs={{ path: url }}
          title="Newsletters"
          subtitle="Pick the emails you want. Each list has its own signup and its own unsubscribe link."
        />
        <div className="flex flex-col gap-section">
          {lists.map((key) => {
            const list = NEWSLETTER_LISTS[key];
            return (
              <section key={key} id={key}>
                <NewsletterForm
                  list={key}
                  heading={<h2 className="flush-top">{list.name}</h2>}
                  text={
                    <div className="mb-para flow-tight">
                      <p>{list.promise}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{list.cadence}</p>
                    </div>
                  }
                  link={
                    key === "live-and-learn" ? (
                      <Link href="/newsletters" className="mt-stack block w-fit">
                        Read the past issues.
                      </Link>
                    ) : (
                      // biome-ignore lint/complexity/noUselessFragments: empty fragment is truthy, suppresses NewsletterForm's default link
                      <></>
                    )
                  }
                />
              </section>
            );
          })}
        </div>
      </PageMain>
    </Layout>
  );
}
