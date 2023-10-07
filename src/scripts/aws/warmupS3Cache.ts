import "dotenv/config";
import { getAllStorageObjectKeys, getDataFromS3 } from "src/lib/aws";
import { mapToImageProps, nextImageUrl } from "src/lib/mapToImageProps";
import axios from "axios";

const imageKeys = await getAllStorageObjectKeys(process.env.AWS_BUCKET_NAME!);
let totalInvocations = 0;

const imageSizes = [128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
for (const imageKey of imageKeys) {
  for (const size of imageSizes) {
    totalInvocations++;
    const url = nextImageUrl("/" + imageKey, size);
    axios.get(url);
  }
}

console.log(totalInvocations);
process.exit();
