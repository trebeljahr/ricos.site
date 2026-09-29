import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { type DonationSource, manageDonationUrl, supportedUrl } from "src/lib/donation";
import { getDonationDesign } from "src/lib/donationDesigns";
import { DonationCard, DonationThanks } from "./DonationCard";
import { ExternalLink } from "./ExternalLink";
import Layout from "./Layout";
import styles from "./ProjectDonationPage.module.css";

export function ProjectDonationPage({
  source,
  justDonated,
}: {
  source: DonationSource;
  justDonated: boolean;
}) {
  const design = getDonationDesign(source);
  const visual = design.image ?? (source.cover ? { ...source.cover, caption: source.name } : null);
  const backHref = source.url ?? (source.slug === "interactive-3d-demos" ? "/r3f" : "/projects");
  const backTo = {
    name: source.url || source.slug === "interactive-3d-demos" ? source.name : "projects",
    href: justDonated ? supportedUrl(new URL(backHref, "https://ricos.site").href) : backHref,
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
      description={`Support Rico's work on ${source.name} and other independent projects.`}
      url="donate"
      keywords={["donate", "support", source.name, "Rico Trebeljahr"]}
      siteChrome={false}
    >
      <div
        className={clsx(styles.shell, styles[design.layout])}
        style={theme}
        data-donation-project={source.slug}
      >
        <a href="#project-donation" className={styles.skip}>
          Skip to donation options
        </a>
        <header className={styles.header}>
          <a href={backTo.href} className={styles.back}>
            <span aria-hidden="true">←</span> Back to {backTo.name}
          </a>
          <Link href="/" className={styles.maker}>
            An independent project by Rico
          </Link>
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
              <p className={styles.invitation}>
                {justDonated
                  ? "Thank you for giving me time to keep making things like this."
                  : design.invitation}
              </p>
              {!justDonated && (
                <a href="#project-donation" className={styles.jump}>
                  Make a donation <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
            {visual && (
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
                <figcaption>{visual.caption}</figcaption>
              </figure>
            )}
          </div>

          <div id="project-donation" className={styles.payment} tabIndex={-1}>
            {justDonated ? (
              <DonationThanks backTo={backTo} />
            ) : (
              <>
                <DonationCard reference={source.slug} title={design.cardTitle} />
                <p className={styles.personalNote}>
                  I’m Rico, the person behind {source.name}. Your donation supports this project and
                  my other independent work. Thank you.
                </p>
              </>
            )}
          </div>
        </main>

        <footer className={styles.footer}>
          <p>
            {justDonated
              ? "Glad to have you here."
              : "Sharing the project with a friend helps, too."}
          </p>
          <div>
            {manageDonationUrl && (
              <ExternalLink href={manageDonationUrl}>Manage your donation</ExternalLink>
            )}
            <Link href="/">
              Rico Trebeljahr <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
