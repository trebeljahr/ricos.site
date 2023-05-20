import { getAllStorageObjectKeys, getObjectMetadata } from "../src/lib/aws.js";
import { config } from "dotenv";
config();

async function main() {
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

main();
