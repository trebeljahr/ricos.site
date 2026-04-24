import type { CommonMetadata } from "src/@types";
import { byOnlyPublished } from "./filters";
import { byDate } from "./sorting";
import { toOnlyMetadata } from "./toOnlyMetadata";

export const extractAndSortMetadata = (list: CommonMetadata[]): CommonMetadata[] => {
  return list.filter(byOnlyPublished).sort(byDate).map(toOnlyMetadata);
};
