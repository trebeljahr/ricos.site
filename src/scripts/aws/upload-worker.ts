import { expose } from "threads/worker";
import { uploadSingleFileToS3 } from "./s3-scripts";

expose(uploadSingleFileToS3);
