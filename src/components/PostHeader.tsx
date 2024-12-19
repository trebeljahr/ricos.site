type Props = {
  title: string;
  subtitle?: string;
};

const Header = ({ title, subtitle }: Props) => {
  return (
    <header className="mb-8">
      <hgroup className="post-header mt-2">
        <h1 className="mb-0 mt-16">{title}</h1>
        <p className="mt-1 text-lg mb-0">{subtitle}</p>
      </hgroup>
    </header>
  );
};

export default Header;
