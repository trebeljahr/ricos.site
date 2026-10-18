/** Optional input-device practice is accessible directly from its demos without unlocking the whole CPU course. */
export const INPUT_DEVICE_CORE_LESSONS = [
  "button-capture",
  "sampled-key-events",
  "matrix-row-select",
  "matrix-row-2",
  "shift-character-map",
  "cpu-button-interface",
] as const;
export const INPUT_DEVICE_LESSONS: readonly string[] = [
  ...INPUT_DEVICE_CORE_LESSONS,
  ...Array.from({ length: 13 }, (_, i) => `matrix-row-${i + 3}`),
];
