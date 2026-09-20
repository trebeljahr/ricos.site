import { BreadCrumbs } from "@components/BreadCrumbs";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type BreadCrumbsProps = ComponentProps<typeof BreadCrumbs>;

type PageMainProps = {
  children: ReactNode;
  className?: string;
};

/**
 * The shell every content page shares: one column, the site gutter, and the
 * page-top and page-bottom steps of the spacing scale (docs/spacing.md). The
 * navbar is sticky, so `pt-page-top` is the whole top offset a page needs.
 */
export const PageMain = ({ children, className }: PageMainProps) => {
  return (
    <main className={clsx("mx-auto max-w-5xl px-gutter pt-page-top pb-region", className)}>
      {children}
    </main>
  );
};

type PageTopProps = {
  /** Omit on pages without breadcrumbs; a spacer of the same height keeps the title in place. */
  breadcrumbs?: BreadCrumbsProps;
  children: ReactNode;
};

/**
 * Top of every content page: breadcrumbs, then a section step before the first
 * block. Pages with a custom title block (book covers, theme heroes) use this
 * directly; everything else goes through `Header`.
 */
export const PageTop = ({ breadcrumbs, children }: PageTopProps) => {
  return (
    <>
      {breadcrumbs ? (
        <BreadCrumbs {...breadcrumbs} />
      ) : (
        <div aria-hidden className="mt-page-top h-5" />
      )}
      <div className="page-top mt-section">{children}</div>
    </>
  );
};

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: BreadCrumbsProps;
  /** Row above the title, e.g. date and reading time. */
  meta?: ReactNode;
};

const Header = ({ title, subtitle, breadcrumbs, meta }: Props) => {
  return (
    <header className="mb-group">
      <PageTop breadcrumbs={breadcrumbs}>
        {meta}
        <hgroup className="post-header">
          <h1>{title}</h1>
          {subtitle && <p className="text-lg">{subtitle}</p>}
        </hgroup>
      </PageTop>
    </header>
  );
};

export default Header;
