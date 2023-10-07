import {
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";

export async function getObjectMetadata(Bucket: string, Key: string) {
  const client = createS3Client();
  const command = new HeadObjectCommand({ Bucket, Key });
  const response = await client.send(command);
  return response;
}

export async function getAllStorageObjectKeys(
  Bucket: string,
  Prefix: string = ""
) {
  const client = createS3Client();

  const command = new ListObjectsV2Command({
    Bucket,
    MaxKeys: 1000,
    Prefix,
  });

  try {
    let isTruncated = true;
    let contents: string[] = [];

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } =
        await client.send(command);

      if (Contents === undefined || IsTruncated === undefined) {
        throw new Error("Something went wrong on the S3 request!");
      }

      contents = contents.concat(Contents.map(({ Key }) => Key || ""));
      isTruncated = IsTruncated;
      command.input.ContinuationToken = NextContinuationToken;
    }
    return contents;
  } catch (err) {
    console.error(err);
    throw new Error("Something went wrong on the S3 request!");
  }
}

export const photographyFolder = "photography/";

export function createS3Client() {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;

  if (!accessKeyId || !secretAccessKey || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  return new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function getS3Folders(prefix: string): Promise<string[]> {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;

  if (!accessKeyId || !secretAccessKey || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket has to be specified");

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Delimiter: "/",
      Prefix: prefix,
    })
  );

  const folders =
    data.CommonPrefixes?.map((data) => data.Prefix?.split("/")[1] || "") || [];

  return folders.sort();
}

export type ImageDataFromAWS = {
  name: string;
  width: number;
  height: number;
};

type OptionsForS3 = {
  prefix?: string;
  numberOfItems?: number;
};

export async function getListingS3(prefix?: string) {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !awsRegion || !bucketName) {
    throw new Error("No AWS credentials provided");
  }

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  const allKeys: string[] = [];
  let data: ListObjectsV2CommandOutput;
  let NextContinuationToken;

  do {
    data = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: NextContinuationToken,
      })
    );

    data.Contents?.forEach(function (content) {
      content.Key && allKeys.push(content.Key);
    });
    NextContinuationToken = data.ContinuationToken;
  } while (data.IsTruncated);

  return allKeys;
}

export const getDataFromS3 = async ({
  prefix,
  numberOfItems = 100,
}: OptionsForS3 = {}) => {
  const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.LOCAL_AWS_REGION;
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !awsRegion || !bucketName) {
    throw new Error("No AWS credentials provided");
  }

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: numberOfItems,
    })
  );

  console.log(data);

  if (!data.Contents) throw new Error("No contents found");

  const output = await Promise.all(
    data.Contents.filter(({ Key }) => {
      if (!Key) return false;

      const split = Key.split("/");
      return split[split.length - 1] !== "";
    }).map(async (file) => {
      const result = await getObjectMetadata(bucketName, file.Key || "");
      return {
        name: (file.Key as string).replace(`${prefix}`, ""),
        width: parseInt(result.Metadata?.width || "100"),
        height: parseInt(result.Metadata?.height || "100"),
      };
    })
  );

  return output;
};
