import { expose } from "threads/worker";
import { getWidthAndHeight } from "./getWidthAndHeight";

expose(getWidthAndHeight);
