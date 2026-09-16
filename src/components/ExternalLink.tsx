import type { ReactNode } from "react";
export const ExternalLink = ({
  href,
  children,
  className = "",
  rel = "noopener noreferrer",
}: {
  href: string;
  children: ReactNode | string;
  className?: string;
  rel?: string;
}) => {
  return (
    <a className={"externalLink " + className} target="_blank" rel={rel} href={href}>
      {children}
    </a>
  );
};
