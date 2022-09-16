import Head from "next/head";

const defaultDescription = `trebeljahr - a blog where a curious person publishes posts about the things he reads and thinks about. The topics can vary widely, 
from programming, traveling, crypto-currencies, the brain, investing, physics, philosophy to photography...`;

const defaultTitle = `Thoughts and Learnings of a Curious Person`;
interface Props {
  description?: string;
  title?: string;
}

const Meta = ({
  description = defaultDescription,
  title = defaultTitle,
}: Props) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
  );
};

export default Meta;
