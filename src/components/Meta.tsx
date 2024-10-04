import Head from "next/head";
import React from "react";

interface Props {
  description: string;
  title: string;
}

const Meta = ({ description, title }: Props) => {
  return (
    <>
      <Head>
        <title>{`${title} | trebeljahr.com`}</title>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <meta name="description" content={description} />
      </Head>
    </>
  );
};

export default Meta;
