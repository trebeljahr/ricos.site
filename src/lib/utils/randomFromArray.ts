function pickRandomFromArray<T>(array: T[], num: number): T[];
function pickRandomFromArray<T>(array: T[]): T;
function pickRandomFromArray<T>(array: T[], num?: number): T | T[] {
  if (num) {
    return array.sort(() => 0.5 - Math.random()).slice(0, num);
  }
  return array[Math.floor(Math.random() * array.length)];
}

export { pickRandomFromArray };
