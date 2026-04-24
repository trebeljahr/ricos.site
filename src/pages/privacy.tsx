import { BreadCrumbs } from "@components/BreadCrumbs";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <Layout
      title="Privacy – ricos.site"
      description="Privacy policy for ricos.site, describing what data is collected and how it is processed."
      url="privacy"
      keywords={["privacy", "datenschutz", "GDPR", "DSGVO", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Privacy", url: "/privacy" },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose prose dark:prose-invert">
          <BreadCrumbs path="privacy" />
          <h1 className="text-4xl mt-16!">Privacy Policy</h1>

          <p>
            Information on the processing of personal data pursuant to Art. 13 GDPR and § 25 TTDSG.
            The operator of this site is Rico Trebeljahr (see{" "}
            <Link href="/imprint" className="text-myBlue hover:underline">
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

          <h2>Analytics — Plausible (self-hosted)</h2>
          <p>
            This site uses <a href="https://plausible.io">Plausible Analytics</a>, a privacy-focused
            web analytics tool. The instance is self-hosted on a server I operate under{" "}
            <code>plausible.trebeljahr.com</code>, so no analytics data is shared with third
            parties.
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
            system, device type, country (derived from the IP, which is then discarded), and — for
            users who have opted in — outbound-link clicks and file downloads.
          </p>
          <p>
            Because no information is stored on or read from your device, no consent under § 25 (1)
            TTDSG is required. Legal basis for the processing itself is Art. 6 (1) (f) GDPR
            (legitimate interest in understanding aggregate site usage to improve the site). You can
            object to this processing at any time — see "Your Rights" below. You can also enable the
            "Do Not Track" setting in your browser; Plausible respects it.
          </p>

          <h2>Newsletter</h2>
          <p>
            If you sign up for the newsletter, your email address is processed for the sole purpose
            of sending newsletter emails. Legal basis: Art. 6 (1) (a) GDPR (consent). You can
            unsubscribe at any time via the link in every newsletter email or by emailing{" "}
            <a
              href="mailto:imprint+ricos.site@trebeljahr.com"
              className="text-myBlue hover:underline"
            >
              imprint+ricos.site@trebeljahr.com
            </a>
            .
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
              Lodge a complaint with a supervisory authority (Art. 77 GDPR) — in Germany, the
              authority of the federal state in which you reside
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact{" "}
            <a
              href="mailto:imprint+ricos.site@trebeljahr.com"
              className="text-myBlue hover:underline"
            >
              imprint+ricos.site@trebeljahr.com
            </a>
            .
          </p>
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}
