import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { createS3Client } from "src/lib/aws";

const s3 = createS3Client();

const bucketName = "images.trebeljahr.com";

async function fixFileNames() {
  try {
    let isTruncated = true;
    let nextContinuationToken;

    while (isTruncated) {
      const objects: ListObjectsV2CommandOutput = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: "photography/",
          ContinuationToken: nextContinuationToken,
        })
      );

      if (objects.Contents === undefined) break;

      await Promise.all(
        objects.Contents.map(async (obj) => {
          const key = obj.Key!;
          const parts = key.split("/");
          if (
            parts.length > 3 &&
            parts[parts.length - 2] === parts[parts.length - 1]
          ) {
            const newKey = "photography-v2/" + parts.slice(0, -1).join("/");
            await s3.send(
              new CopyObjectCommand({
                Bucket: bucketName,
                CopySource: `${bucketName}/${key}`,
                Key: newKey,
              })
            );
          }
        })
      );

      isTruncated = objects.IsTruncated || false;
      nextContinuationToken = objects.NextContinuationToken;
    }
  } catch (err) {
    console.error(err);
  }
}

fixFileNames();
