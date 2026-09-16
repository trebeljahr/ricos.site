import { BreadCrumbs } from "@components/BreadCrumbs";
import type { ComponentProps, ReactNode } from "react";

type BreadCrumbsProps = ComponentProps<typeof BreadCrumbs>;

type PageTopProps = {
  /** Omit on pages without breadcrumbs; a spacer of the same height keeps the title in place. */
  breadcrumbs?: BreadCrumbsProps;
  children: ReactNode;
};

/**
 * Top of every content page: breadcrumbs, then a fixed gap before the first
 * block. Pages with a custom title block (book covers, theme heroes) use this
 * directly; everything else goes through `Header`.
 */
export const PageTop = ({ breadcrumbs, children }: PageTopProps) => {
  return (
    <>
      {breadcrumbs ? <BreadCrumbs {...breadcrumbs} /> : <div aria-hidden className="mt-5 h-5" />}
      <div className="mt-16">{children}</div>
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
    <header className="mb-8">
      <PageTop breadcrumbs={breadcrumbs}>
        {meta}
        <hgroup className="post-header">
          <h1 className={meta ? "mt-2! mb-0!" : "mt-0! mb-0!"}>{title}</h1>
          {subtitle && <p className="mt-4! mb-0! text-lg">{subtitle}</p>}
        </hgroup>
      </PageTop>
    </header>
  );
};

export default Header;
