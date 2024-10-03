import DateFormatter from "./DateFormatter";
import React from "react";

type Props = {
  title: string;
  date?: string;
  subtitle?: string;
};

const Header = ({ title, subtitle, date }: Props) => {
  return (
    <header>
      <hgroup className="post-header mb-10">
        {date && <DateFormatter date={date} />}
        <h1 className="mb-0 mt-10">{title}</h1>
        <p className="mt-1 text-lg">{subtitle}</p>
      </hgroup>
    </header>
  );
};

export default Header;
