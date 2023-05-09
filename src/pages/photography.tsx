import Link from "next/link";
import Layout from "../components/layout";
import Image from "next/image";
import { getS3Folders, getS3ImageData } from "src/lib/aws";

export default function Photography({ tripNames }: { tripNames: string[] }) {
  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url="photography"
    >
      <h1>Photography</h1>
      {tripNames.map((tripName) => {
        return (
          <Link href={`/photography/${tripName}`} key={tripName}>
            {tripName}
          </Link>
        );
      })}
    </Layout>
  );
}

export async function getStaticProps() {
  const tripNames = await getS3Folders();
  console.log(tripNames);
  return { props: { tripNames } };
}
