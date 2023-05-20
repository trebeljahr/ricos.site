import { getAllStorageObjectKeys, getObjectMetadata } from "../src/lib/aws.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from "src/lib/aws";
import { readFileSync } from "fs";
import { getType } from "mime";
import { config } from "dotenv";
import path from "path";
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

  console.log(getType(filepath));

  const command = new PutObjectCommand({
    Bucket,
    Key,
    Body,
    ContentType: getType(filepath) || undefined,
    Metadata,
  });

  try {
    const response = await client.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}

export async function readS3MetadataForAllStorageObjects() {
  const bucketName = process.env.LOCAL_AWS_BUCKET_NAME;
  if (!bucketName) throw new Error("No bucket name provided in .env file");

  const allKeys = await getAllStorageObjectKeys(bucketName, "photography/");
  console.log(allKeys);

  const metadata = await Promise.all(
    allKeys.map((key) => {
      return getObjectMetadata(bucketName, key);
    })
  );

  console.log(metadata);
}
