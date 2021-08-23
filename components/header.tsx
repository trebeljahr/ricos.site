import Link from "next/link";

const Header = () => {
  return (
    <h2 className="header text-2xl md:text-4xl font-bold tracking-tight md:tracking-tighter leading-tight mb-20 mt-8">
      <Link href="/">
        <a className="hover:underline">trebeljahr</a>
      </Link>
      .
    </h2>
  );
};

export default Header;
