import "dotenv/config";
import {
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import pLimit from "p-limit";

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
    let keys: string[] = [];

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } =
        await client.send(command);

      if (Contents === undefined || IsTruncated === undefined) {
        throw new Error("Something went wrong on the S3 request!");
      }

      keys = keys.concat(Contents.map(({ Key }) => Key || ""));
      isTruncated = IsTruncated;
      command.input.ContinuationToken = NextContinuationToken;
    }
    return keys;
  } catch (err) {
    console.error(err);
    throw new Error("Something went wrong on the S3 request!");
  }
}

export const photographyFolder = "Attachments/Photography/";

export function createS3Client() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;

  if (!accessKeyId || !secretAccessKey || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  return new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function getS3Folders(prefix: string): Promise<string[]> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;

  if (!accessKeyId || !secretAccessKey || !awsRegion) {
    throw new Error("No AWS credentials provided");
  }

  const bucketName = process.env.AWS_BUCKET_NAME;
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
    data.CommonPrefixes?.map((data) => data.Prefix?.split("/")[2] || "") || [];

  return folders.sort();
}

export type ImageDataFromAWS = {
  name: string;
  width: number;
  height: number;
};

const limit = pLimit(10);

interface OptionsForS3 {
  prefix?: string;
}

export const getDataFromS3 = async ({ prefix = "" }: OptionsForS3 = {}) => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bucketName = process.env.AWS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !awsRegion || !bucketName) {
    throw new Error("No AWS credentials provided");
  }

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });

  let isTruncated = true;
  let continuationToken;
  const output = [];

  while (isTruncated) {
    const data: any = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 1000, // Max 1000 per request
        ContinuationToken: continuationToken, // Handle pagination
      })
    );

    if (!data.Contents) throw new Error("No contents found");

    const imagePromises = data.Contents.filter(({ Key }: { Key: any }) => {
      if (!Key) return false;
      const split = Key.split("/");
      return split[split.length - 1] !== "";
    }).map((file: any) =>
      limit(async () => {
        const result = await getObjectMetadata(bucketName, file.Key || "");
        return {
          name: (file.Key as string).replace(`${prefix}`, ""),
          width: parseInt(result.Metadata?.width || "100"),
          height: parseInt(result.Metadata?.height || "100"),
        };
      })
    );

    const batchResults = await Promise.all(imagePromises);
    output.push(...batchResults);

    // Handle pagination
    isTruncated = data.IsTruncated || false;
    continuationToken = data.NextContinuationToken;
  }

  return output;
};

export const getFirstImageFromS3 = async ({
  prefix = "",
}: OptionsForS3 = {}) => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bucketName = process.env.AWS_BUCKET_NAME;

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
      MaxKeys: 1,
    })
  );

  if (!data.Contents || data.Contents.length === 0) {
    throw new Error("No images found in the S3 bucket");
  }

  const firstFile = data.Contents[0];
  if (!firstFile.Key) {
    throw new Error("No valid image key found");
  }

  const result = await getObjectMetadata(bucketName, firstFile.Key);

  return {
    name: firstFile.Key.replace(`${prefix}`, ""),
    width: parseInt(result.Metadata?.width || "100"),
    height: parseInt(result.Metadata?.height || "100"),
  };
};
