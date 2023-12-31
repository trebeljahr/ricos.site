import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { createS3Client } from "src/lib/aws";

// Initialize S3 Client
const s3 = createS3Client();

// Your bucket name
const bucketName = "images.trebeljahr.com";

// Function to list and move objects
async function fixFileNames() {
  try {
    // List objects in the "photography" folder
    const objects = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "photography/",
      })
    );

    // Filter and move each object
    console.log(objects.IsTruncated);

    objects.Contents?.slice(0, 5).forEach(async (obj) => {
      const key = obj.Key!;
      // Identify and construct new key
      const parts = key.split("/");
      if (
        parts.length > 3 &&
        parts[parts.length - 2] === parts[parts.length - 1]
      ) {
        const newKey = parts.slice(0, -1).join("/");

        // Copy the object to the new location
        await s3.send(
          new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`,
            Key: newKey,
          })
        );

        // // Delete the old object
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        );

        console.log(`Moved ${bucketName}/${key} to ${newKey}`);
      }
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Run the function
fixFileNames();
