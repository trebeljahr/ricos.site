import { expose } from "threads/worker";
import { uploadSingleFileToS3 } from "./helpers";

expose(uploadSingleFileToS3);
