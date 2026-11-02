/**
 * The one import site for the circuit builder. Turbopack copies shared modules
 * into each separate `import()`, which shipped LogicBuilder three times on one
 * chapter, so every demo that needs it loads through here and shares one chunk.
 */
export const loadCircuitDemos = () => import("./circuitDemos");
