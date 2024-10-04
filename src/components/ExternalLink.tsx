import { ReactNode } from "react";
export const ExternalLink = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode | string;
  className?: string;
}) => {
  return (
    <a
      className={"externalLink " + className}
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      {children}
    </a>
  );
};
