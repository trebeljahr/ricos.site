/**
 * The one import site for the 3D demos. They share a small renderer, and Turbopack
 * copies shared modules into each separate `import()`, so they load through here
 * and a chapter ships that renderer once.
 */
export const loadGraphicsDemos = () => import("./graphicsDemos");
