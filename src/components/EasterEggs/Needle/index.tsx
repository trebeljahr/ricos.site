import dynamic from "next/dynamic";

// Client only: the pile is placed against the measured article box after mount.
export const NeedleEgg = dynamic(() => import("./NeedleEgg"), { ssr: false });
