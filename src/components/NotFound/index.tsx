import dynamic from "next/dynamic";

export const HiddenPages = dynamic(() => import("./HiddenPages"), { ssr: false });
