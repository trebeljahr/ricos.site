import { ListObjectsV2Command, S3, S3Client } from "@aws-sdk/client-s3";

export const getImageSources = ({
  imageFileNames,
}: {
  imageFileNames: string[];
}) => {
  const domain = process.env.NEXT_PUBLIC_STATIC_FILE_URL;
  if (!domain) {
    throw new Error("No static file URL provided");
  }

  return imageFileNames.map((fileName) => ({
    src: `https://${domain}/${fileName}`,
  }));
};

type Options = {
  prefix?: string;
};

export const getS3ImageData = async ({ prefix = "" }: Options = {}) => {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !bucketName || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  return await getDataFromS3({
    accessKeyId,
    secretAccessKey,
    awsRegion,
    bucketName,
    prefix,
  });
};

export async function getS3Folders(): Promise<string[]> {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !bucketName || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Delimiter: "/",
      Prefix: "photography/",
    })
  );

  console.log(data);

  const folders =
    data.CommonPrefixes?.map((prefix) => prefix.Prefix?.split("/")[1] || "") ||
    [];

  console.log(folders);
  return folders.sort();
}

export const getDataFromS3 = async ({
  accessKeyId,
  secretAccessKey,
  awsRegion,
  bucketName,
  prefix = "",
}: {
  accessKeyId: string;
  secretAccessKey: string;
  awsRegion: string;
  bucketName: string;
  prefix?: string;
}) => {
  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `photography/${prefix}/`,
    })
  );

  if (data.KeyCount && data.MaxKeys && data.KeyCount >= data.MaxKeys) {
    throw new Error("Can't display all objects in the bucket");
  }

  console.log(data);
  console.log(data.Contents);

  console.log(prefix);

  return (
    data.Contents?.filter(({ Key }) => Key !== `photography/${prefix}/`).map(
      (file) => (file.Key as string).replace("photography/", "")
    ) ?? []
  );
};
