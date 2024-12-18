import { expose } from "threads/worker";
import { getWidthAndHeightFromFileSystem } from "./getWidthAndHeight";

expose(getWidthAndHeightFromFileSystem);
