import { createContext } from "react";

/** Embedded boards share chapter scrolling and omit standalone navigation. */
export const ComputerEmbedContext = createContext(false);
