import "dotenv/config";
import { getDataFromS3, getListingS3 } from "src/lib/aws";
import { mapToImageProps, nextImageUrl } from "src/lib/mapToImageProps";
import axios from "axios";

const imageKeys = await getListingS3();

let totalInvocations = 0;

const imageSizes = [3840];
for (const imageKey of imageKeys) {
  for (const size of imageSizes) {
    totalInvocations++;
    const url = nextImageUrl("/" + imageKey, size);
    console.log(url);
    // axios.get(url);
  }
}

console.log(totalInvocations);
process.exit();
