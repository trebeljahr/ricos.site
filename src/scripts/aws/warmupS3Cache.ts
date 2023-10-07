import "dotenv/config";
import { getDataFromS3, getListingS3 } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import axios from "axios";

const imageData = await getDataFromS3();

// const s3Data = await getListingS3();

const allImages = mapToImageProps(imageData, "");
for (const image of allImages) {
  for (const srcSet of image.srcSet) {
    console.log(srcSet.src);

    axios.get(srcSet.src);
  }
}
process.exit();
