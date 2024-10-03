import Head from "next/head";
import Script from "next/script";

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
      <Script src="https://cdn.jsdelivr.net/gh/ncase/nutshell/nutshell.js"></Script>
    </>
  );
};

export default Meta;
