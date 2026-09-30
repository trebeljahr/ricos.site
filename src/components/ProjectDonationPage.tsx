import clsx from "clsx";
import Head from "next/head";
import Image from "next/image";
import type { CSSProperties } from "react";
import { type DonationSource, manageDonationUrl, supportedUrl } from "src/lib/donation";
import { getDonationDesign } from "src/lib/donationDesigns";
import { donationPath } from "src/lib/donationNavigation";
import { DonationCard, DonationThanks } from "./DonationCard";
import { ExternalLink } from "./ExternalLink";
import Layout from "./Layout";
import styles from "./ProjectDonationPage.module.css";

export function ProjectDonationPage({
  source,
  justDonated,
  returnTo,
}: {
  source: DonationSource;
  justDonated: boolean;
  returnTo: string;
}) {
  const design = getDonationDesign(source);
  const projectIcon =
    source.brand?.icon ??
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${design.background}"/><text x="32" y="45" text-anchor="middle" font-family="sans-serif" font-size="42" fill="${design.accent}">${source.name[0]}</text></svg>`)}`;
  const visual = design.image ?? source.cover;
  const backTo = {
    name: source.name,
    href: justDonated ? supportedUrl(returnTo) : returnTo,
    icon: source.brand?.icon,
  };
  const theme = {
    "--donation-bg": design.background,
    "--donation-surface": design.surface,
    "--donation-ink": design.ink,
    "--donation-muted": design.muted,
    "--donation-border": design.border,
    "--color-accent": design.accent,
    "--donation-heading-font":
      design.headingFont === "serif"
        ? "Georgia, 'Times New Roman', serif"
        : design.headingFont === "mono"
          ? "ui-monospace, SFMono-Regular, monospace"
          : "inherit",
    colorScheme: design.dark ? "dark" : "light",
  } as CSSProperties;

  return (
    <Layout
      title={`${justDonated ? "Thank you" : "Support"} – ${source.name}`}
      description={design.invitation}
      url={donationPath(source.slug)}
      image={design.artworks?.[0]?.src ?? visual?.src}
      imageAlt={design.artworks?.[0]?.alt ?? visual?.alt}
      keywords={["donate", "support", source.name, "Rico Trebeljahr"]}
      siteChrome={false}
    >
      <Head>
        <meta name="theme-color" content={design.background} />
        <meta name="color-scheme" content={design.dark ? "dark" : "light"} />
        <meta name="application-name" content={source.name} />
        <meta property="og:site_name" content={source.name} />
        <link rel="icon" sizes="any" href={projectIcon} />
      </Head>
      <div
        className={clsx(styles.shell, styles[design.layout])}
        style={theme}
        data-donation-project={source.slug}
      >
        <a href="#project-donation" className={styles.skip}>
          Skip to donation options
        </a>
        <header className={styles.header}>
          <a
            href={backTo.href}
            className={styles.back}
            aria-label={`Go back to ${source.name}`}
            title={`Return to ${source.name}`}
          >
            <span aria-hidden="true">←</span> Go back
          </a>
          <span className={styles.maker}>{source.name} · Support</span>
        </header>

        <main className={styles.main}>
          <div className={styles.story}>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>
                {source.brand?.icon && (
                  <Image src={source.brand.icon} alt="" aria-hidden="true" width={28} height={28} />
                )}
                {justDonated ? "With your support" : "A little support for"}
              </p>
              <h1>{source.name}</h1>
              <p className={styles.invitation}>{justDonated ? design.thanks : design.invitation}</p>
            </div>
            {design.artworks ? (
              <section className={styles.artworks} aria-label="From the collection">
                {design.artworks.map((artwork) => (
                  <figure key={artwork.src} className={styles.artwork}>
                    <div>
                      <Image
                        src={artwork.src}
                        alt={artwork.alt}
                        fill
                        priority
                        sizes="(max-width: 900px) 45vw, 28vw"
                      />
                    </div>
                  </figure>
                ))}
              </section>
            ) : (
              visual && (
                <figure className={styles.visual}>
                  <div className={styles.imageFrame}>
                    <Image
                      src={visual.src}
                      alt={visual.alt}
                      fill
                      priority
                      sizes="(max-width: 900px) 100vw, 55vw"
                      className={styles.image}
                    />
                  </div>
                </figure>
              )
            )}
          </div>

          <div id="project-donation" className={styles.payment} tabIndex={-1}>
            {justDonated ? (
              <DonationThanks backTo={backTo} message={design.thanks} />
            ) : (
              <DonationCard reference={source.slug} title={design.cardTitle} />
            )}
          </div>
        </main>

        <footer className={styles.footer}>
          <div>
            {manageDonationUrl && (
              <ExternalLink href={manageDonationUrl}>Manage monthly donation</ExternalLink>
            )}
            <a href={backTo.href}>
              Back to {source.name} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
