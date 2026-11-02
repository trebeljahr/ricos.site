import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";

// Client only: the tail is placed against the viewport edge after mount.
export const DinoTail = dynamic(() => whenIdle().then(() => import("./DinoTail")), { ssr: false });
