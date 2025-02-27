export const pickRandomFromArray = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};
