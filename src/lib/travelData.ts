import { loadVeliteData } from "src/lib/loadVeliteData";
import { byOnlyPublished } from "src/lib/utils/filters";

export function getTravelingStoryNames(): string[] {
  const travelblogs = loadVeliteData("travelblogs.json");
  return [
    ...travelblogs
      .filter(byOnlyPublished)
      .reduce((agg: Set<string>, current: any) => {
        agg.add(current.parentFolder);
        return agg;
      }, new Set<string>()),
  ];
}
