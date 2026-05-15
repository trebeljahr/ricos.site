import "dotenv/config";
import {
  ensureLocalS3Layout,
  LOCAL_S3_DATA_DIR,
  RESIZED_BUCKET,
  SOURCE_BUCKET,
} from "src/lib/localS3";

try {
  ensureLocalS3Layout();
  console.log("Local S3 mock ready");
  console.log(`  root ${LOCAL_S3_DATA_DIR}`);
  console.log(`  bucket ${SOURCE_BUCKET} -> symlinked src/content/Notes/assets`);
  console.log(`  bucket ${RESIZED_BUCKET} -> local cache`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
