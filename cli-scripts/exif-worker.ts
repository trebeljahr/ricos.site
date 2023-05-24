import { expose } from "threads/worker";
import { getExifData } from "./getExifData";

expose(getExifData);
