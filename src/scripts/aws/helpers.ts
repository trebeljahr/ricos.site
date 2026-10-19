import { readFileSync } from "node:fs";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";
import {
  createS3Client,
  getAllStorageObjectKeys,
  getImageMetadataFromFileSystemOrAWS,
} from "src/lib/aws";
import { getWidthAndHeightFromFileSystem } from "src/scripts/aws/getWidthAndHeight";
import {
  assetsMetadataFilePath,
  type ImageMetadata,
  updateMetadataFile,
} from "../metadataJsonFileHelpers";

const Bucket = "images.trebeljahr.com";

export function createKey(prefix: string, filepath: string) {
  const filename = path.basename(filepath);
  return path.join(prefix, filename);
}

export async function doesFileExistInS3(filePath: string): Promise<boolean> {
  const command = new HeadObjectCommand({
    Bucket,
    Key: filePath,
  });

  const s3 = createS3Client();

  try {
    await s3.send(command);
    return true;
  } catch (error) {
    if ((error as Error).name === "NotFound") {
      return false;
    }
    throw error;
  }
}

/**
 * Uploads one file and returns its metadata.json entry, or null when the
 * upload failed. It does not write metadata.json: the caller saves the
 * entries of a whole run in one updateMetadataFileBulk call.
 */
export async function uploadWithMetadata(
  filepath: string,
  Key: string,
  Metadata: Record<string, string>,
): Promise<ImageMetadata | null> {
  const client = createS3Client();
  const Body = readFileSync(filepath);

  const command = new PutObjectCommand({
    Bucket,
    Key,
    Body,
    ContentType: mime.getType(filepath) || undefined,
    Metadata,
  });

  try {
    await client.send(command);

    return {
      key: Key,
      width: Number.parseInt(Metadata.width, 10),
      height: Number.parseInt(Metadata.height, 10),
      aspectRatio: Number.parseFloat(Metadata.aspectRatio),
      existsInS3: true,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function readS3MetadataForAllStorageObjects(prefix: string) {
  const bucketName = process.env.AWS_BUCKET_NAME;
  if (!bucketName) throw new Error("No bucket name provided in .env file");
  const allKeys = await getAllStorageObjectKeys(bucketName, prefix);

  const metadata = await Promise.all(
    allKeys.map((key) => {
      return getImageMetadataFromFileSystemOrAWS(bucketName, key);
    }),
  );

  return metadata;
}

export async function uploadSingleFileToS3(filepath: string, awsPath: string) {
  const key = createKey(awsPath, filepath);

  const data = await getWidthAndHeightFromFileSystem(filepath);

  try {
    const w = data?.width;
    const h = data?.height;
    const entry = await uploadWithMetadata(filepath, key, {
      width: String(w),
      height: String(h),
      aspectRatio: String(w / h),
    });
    if (entry) await updateMetadataFile(assetsMetadataFilePath, entry);
  } catch (error) {
    console.error(error);
  }
}
