import dynamic from "next/dynamic";

// Client only: the tail is placed against the viewport edge after mount.
export const DinoTail = dynamic(() => import("./DinoTail"), { ssr: false });
