/**
 * Splits an array into random groups of a specified size.
 * @param arr - The input array to split.
 * @param groupSize - The size of each group.
 * @returns An array of groups (arrays) containing randomly ordered elements.
 */
export function splitIntoRandomGroupsOfSize<T>(
  arr: T[],
  groupSize: number
): T[][] {
  if (arr.length % groupSize !== 0) {
    throw new Error("Array length must be divisible by the group size.");
  }

  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const groups: T[][] = [];
  for (let i = 0; i < shuffled.length; i += groupSize) {
    groups.push(shuffled.slice(i, i + groupSize));
  }

  return groups;
}

/**
 * Splits an array into a configurable number of random groups of equal size.
 * @param arr - The input array to split.
 * @param numGroups - The number of groups to create.
 * @returns An array of groups (arrays) containing randomly ordered elements.
 * @throws Will throw an error if the array cannot be evenly divided into the specified number of groups.
 */
export function splitIntoRandomGroups<T>(arr: T[], numGroups: number): T[][] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const groups: T[][] = Array.from({ length: numGroups }, () => []);

  shuffled.forEach((element, index) => {
    groups[index % numGroups].push(element);
  });

  return groups;
}
