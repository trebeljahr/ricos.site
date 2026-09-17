import dynamic from "next/dynamic";

// Only loads the first time someone switches to dark mode.
export const NightOwl = dynamic(() => import("./NightOwl"), { ssr: false });
