import Head from "next/head";
interface Props {
  description: string;
  title: string;
}

const Meta = ({ description, title }: Props) => {
  return (
    <>
      <Head>
        <title>{`${title} | ricos.site`}</title>

        <meta name="description" content={description} />
      </Head>
    </>
  );
};

export default Meta;
