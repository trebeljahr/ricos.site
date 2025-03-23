import { byDate } from "./misc";
import { byOnlyPublished } from "./filters";
import { CommonMetadata } from "src/@types";
import { toOnlyMetadata } from "./toOnlyMetadata";

export const extractAndSortMetadata = (
  list: CommonMetadata[]
): CommonMetadata[] => {
  return list.filter(byOnlyPublished).sort(byDate).map(toOnlyMetadata);
};
