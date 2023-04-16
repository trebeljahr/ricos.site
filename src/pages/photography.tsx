import Layout from "../components/layout";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import Image from "next/image";

export default function Photography({
  imageFileNames,
}: {
  imageFileNames: string[];
}) {
  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url="photography"
    >
      <h1>Photography</h1>
      {getImageSources({ imageFileNames }).map(({ src }, index) => {
        return (
          <Image
            key={index}
            src={src}
            width="6"
            height="4"
            alt={src}
            sizes="100vw"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "cover",
            }}
          />
        );
      })}
    </Layout>
  );
}

export const getStaticProps = async () => {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !bucketName || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  const imageFileNames = await getImagesFromS3({
    accessKeyId,
    secretAccessKey,
    awsRegion,
    bucketName,
  });

  return { props: { imageFileNames } };
};

const getImageSources = ({ imageFileNames }: { imageFileNames: string[] }) => {
  const domain = process.env.NEXT_PUBLIC_STATIC_FILE_URL;
  if (!domain) {
    throw new Error("No static file URL provided");
  }

  return imageFileNames.map((fileName) => ({
    src: `https://${domain}/${fileName}`,
  }));
};

const getImagesFromS3 = async ({
  accessKeyId,
  secretAccessKey,
  awsRegion,
  bucketName,
}: {
  accessKeyId: string;
  secretAccessKey: string;
  awsRegion: string;
  bucketName: string;
}) => {
  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
    })
  );

  if (data.KeyCount && data.MaxKeys && data.KeyCount >= data.MaxKeys) {
    throw new Error("Can't display all objects in the bucket");
  }

  return data.Contents?.map((file) => file.Key as string) ?? [];
};
