export const ExternalLink = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: string;
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
