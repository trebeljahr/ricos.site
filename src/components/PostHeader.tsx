type Props = {
  title: string;
  subtitle?: string;
};

const Header = ({ title, subtitle }: Props) => {
  return (
    <header>
      <hgroup>
        <h1>{title}</h1>
        <p className="text-lg">{subtitle}</p>
      </hgroup>
    </header>
  );
};

export default Header;
