import { expose } from "threads/worker";
import { getWidthAndHeight } from "./getExifData";

expose(getWidthAndHeight);
