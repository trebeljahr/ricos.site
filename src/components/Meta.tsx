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
        <meta name="description" content={description} />
      </Head>
    </>
  );
};

export default Meta;
