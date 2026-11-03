/**
 * The one import site for the Unicode demos. They share a table of code point
 * names, and Turbopack copies shared modules into each separate `import()`, so
 * they load through here and a chapter ships that table once.
 */
export const loadUnicodeDemos = () => import("./unicodeDemos");
