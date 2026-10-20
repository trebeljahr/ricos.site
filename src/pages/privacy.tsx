import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <Layout
      title="Privacy – ricos.site"
      description="Privacy policy for ricos.site: what data is collected, how it is processed, which hosting and analytics services are used, and your GDPR rights."
      url="privacy"
      keywords={["privacy", "datenschutz", "GDPR", "DSGVO", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Privacy", url: "/privacy" },
        ]}
      />
      <PageMain>
        <article className="mx-auto max-w-prose prose md:prose-lg xl:prose-xl dark:prose-invert">
          <Header breadcrumbs={{ path: "privacy" }} title="Privacy Policy" />

          <p>
            Information on the processing of personal data pursuant to Art. 13 GDPR and § 25 TTDSG.
            The operator of this site is Rico Trebeljahr (see{" "}
            <Link href="/imprint" className="text-accent hover:underline">
              Imprint
            </Link>
            ).
          </p>

          <h2>Hosting</h2>
          <p>
            This site is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.
            When you visit the site, Vercel automatically processes server-log data (IP address,
            user agent, timestamp, referrer) to deliver the site and protect against abuse. Legal
            basis: Art. 6 (1) (f) GDPR (legitimate interest in operating the site securely).
          </p>
          <p>
            Before a request reaches Vercel, it passes through the network of Cloudflare, Inc., 101
            Townsend St, San Francisco, CA 94107, USA. Cloudflare receives the IP address, user
            agent and referrer of each request to deliver the site and protect it against abuse. The
            same legal basis applies.
          </p>

          <h2>Performance measurement: Cloudflare Web Analytics</h2>
          <p>
            Cloudflare adds the script of{" "}
            <a href="https://developers.cloudflare.com/web-analytics/">Cloudflare Web Analytics</a>{" "}
            to each page. Your browser loads it from <code>static.cloudflareinsights.com</code>, and
            the script sends its report to <code>ricos.site/cdn-cgi/rum</code>.
          </p>
          <p>
            The report holds the page URL, the referrer and how long the page took to load,
            including Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout
            Shift. Cloudflare shows me totals by page, country, browser and device type. The script
            sets no cookies and stores nothing on your device. It gives each page view a random ID
            and keeps no ID from one page view to the next. Cloudflare receives your IP address with
            the report, discards it at the nearest data center and does not store it.
          </p>
          <p>
            Cloudflare does not add the script for visitors who connect through a Cloudflare data
            center in the EU, the EEA, the United Kingdom or Switzerland. For all other visitors the
            legal basis is Art. 6 (1) (f) GDPR (legitimate interest in knowing how fast the pages
            load). You can object at any time. See "Your Rights" below. You can also block{" "}
            <code>static.cloudflareinsights.com</code> with a content blocker.
          </p>

          <h2>Analytics: Plausible (self-hosted)</h2>
          <p>
            This site uses <a href="https://plausible.io">Plausible Analytics</a>, a privacy-focused
            web analytics tool. The instance is self-hosted on a server I operate under{" "}
            <code>plausible.trebeljahr.com</code>, so Plausible's data is not shared with third
            parties.
          </p>
          <p>
            Your browser loads the Plausible script from this site (<code>ricos.site</code>) and
            sends its events here too, not to <code>plausible.trebeljahr.com</code> directly. The
            site server forwards each event to my Plausible instance together with your IP address
            and user agent, so that Plausible can count visitors and derive the country as described
            below. The forwarding keeps no copy of the data; the server-log processing described
            under "Hosting" still applies.
          </p>
          <p>
            Plausible does <strong>not use cookies</strong> and does not store anything on your
            device. It does not track visitors across sites or over time and does not collect any
            personal data as defined by the GDPR. IP addresses and user agents are only used
            transiently, combined with a daily-rotating site-wide salt, to generate an anonymous
            hash so that a returning visitor on the same day can be counted as one visit. The raw IP
            and user agent are never stored, and the salt is discarded after 24 hours, making the
            hash irreversible.
          </p>
          <p>
            The following aggregated data is recorded: page URL, HTTP referrer, browser, operating
            system, device type, country (derived from the IP, which is then discarded), and, for
            users who have opted in, outbound-link clicks and file downloads.
          </p>
          <p>
            Because no information is stored on or read from your device, no consent under § 25 (1)
            TTDSG is required. Legal basis for the processing itself is Art. 6 (1) (f) GDPR
            (legitimate interest in understanding aggregate site usage to improve the site). You can
            object to this processing at any time. See "Your Rights" below. You can also enable the
            "Do Not Track" setting in your browser; Plausible respects it.
          </p>

          <h2>Newsletters and announcements</h2>
          <p>
            You can sign up for three mailing lists here: Live and Learn, my newsletter; new
            chapters of How computers work; and New things from Rico, one email each time I put out
            a new thing. Signup forms on my other websites can add you to New things from Rico as
            well. Those forms send your email address to this site, and the rest of this section
            applies to them too.
          </p>
          <p>
            After you sign up, this site sends you an email with a confirmation link. Until you
            click it, your address is on no list: the link itself carries your address and the lists
            you picked. When you click it, your address goes on those lists. Legal basis: Art. 6 (1)
            (a) GDPR (consent).
          </p>
          <p>
            For each subscriber I store the email address, the lists, whether each subscription is
            confirmed or unsubscribed, and when that changed. I do not store which page or website
            you signed up on, the referrer, or anything else about your visit. To slow down mass
            signups, the signup form holds your IP address in memory for up to one minute and then
            forgets it. The emails contain no tracking pixels and no tracked links. If an email
            bounces or is marked as spam, that is recorded so that I stop sending to the address.
          </p>
          <p>
            The lists are kept in <a href="https://listmonk.app">Listmonk</a>, which I host myself
            on a server of Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany, in
            its Nuremberg data center. The emails are sent through Amazon Simple Email Service,
            operated by Amazon Web Services EMEA SARL, 38 Avenue John F. Kennedy, L-1855 Luxembourg,
            in its EU (Ireland) region. Amazon receives your address and each email in order to
            deliver it, and reports back whether it was delivered.
          </p>
          <p>
            You can unsubscribe at any time via the link in every email or by emailing{" "}
            <a
              href="mailto:imprint+ricos.site@trebeljahr.com"
              className="text-accent hover:underline"
            >
              imprint+ricos.site@trebeljahr.com
            </a>
            . After you unsubscribe, your address stays on record as unsubscribed so that you get no
            more emails. Ask me and I delete it completely.
          </p>

          <h2>RSS feeds</h2>
          <p>
            The RSS feeds on this site (<code>/rss.xml</code> and <code>/projects/rss.xml</code>)
            need no signup. Your feed reader fetches them like any other page, and the server-log
            processing described under "Hosting" applies.
          </p>

          <h2>Your Rights</h2>
          <p>Under the GDPR you have the right to:</p>
          <ul>
            <li>Access the personal data I hold about you (Art. 15 GDPR)</li>
            <li>Request correction or deletion (Art. 16, 17 GDPR)</li>
            <li>Restrict processing (Art. 18 GDPR)</li>
            <li>Data portability (Art. 20 GDPR)</li>
            <li>
              Object to processing based on legitimate interest, including analytics (Art. 21 GDPR)
            </li>
            <li>
              Lodge a complaint with a supervisory authority (Art. 77 GDPR). In Germany that is the
              authority of the federal state in which you reside
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact{" "}
            <a
              href="mailto:imprint+ricos.site@trebeljahr.com"
              className="text-accent hover:underline"
            >
              imprint+ricos.site@trebeljahr.com
            </a>
            .
          </p>
        </article>

        <footer className="mx-auto mt-section max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}
