import { PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { getType } from "mime";
import path from "path";
import { createS3Client } from "src/lib/aws";
import {
  bucketPrefix,
  getAllStorageObjectKeys,
  getObjectMetadata,
} from "../../lib/aws.js";
import { getWidthAndHeight } from "./getWidthAndHeight.js";
config({ path: "../.env" });

export function createKey(prefix: string, filepath: string) {
  const filename = path.basename(filepath);
  return path.join(prefix, filename);
}

export async function uploadWithMetadata(
  filepath: string,
  Key: string,
  Metadata: Record<string, string>
) {
  const Bucket = process.env.LOCAL_AWS_BUCKET_NAME;
  if (!Bucket) throw new Error("No bucket name provided in .env file");

  const client = createS3Client();
  const Body = readFileSync(filepath);

  const command = new PutObjectCommand({
    Bucket,
    Key,
    Body,
    ContentType: getType(filepath) || undefined,
    Metadata,
  });

  try {
    await client.send(command);
  } catch (err) {
    console.error(err);
  }
}

export async function readS3MetadataForAllStorageObjects() {
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;
  if (!bucketName) throw new Error("No bucket name provided in .env file");

  const allKeys = await getAllStorageObjectKeys(bucketName, `${bucketPrefix}`);

  const metadata = await Promise.all(
    allKeys.map((key) => {
      return getObjectMetadata(bucketName, key);
    })
  );

  return metadata;
}

export async function uploadSingleFileToS3(filepath: string, tripName: string) {
  const key = createKey(`${bucketPrefix}${tripName}`, filepath);

  const data = await getWidthAndHeight(filepath);

  try {
    await uploadWithMetadata(filepath, key, {
      width: String(data?.width),
      height: String(data?.height),
    });
  } catch (error) {
    console.error(error);
  }
}
