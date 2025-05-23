import dynamic from "next/dynamic";

export const Bush1 = dynamic(() => import("./Bush1"), { ssr: false });
export const Bush2 = dynamic(() => import("./Bush2"), { ssr: false });
export const Bush3 = dynamic(() => import("./Bush3"), { ssr: false });
export const Grass1 = dynamic(() => import("./Grass1"), { ssr: false });
export const Grass2 = dynamic(() => import("./Grass2"), { ssr: false });
export const Grass3 = dynamic(() => import("./Grass3"), { ssr: false });
export const Rock1 = dynamic(() => import("./Rock1"), { ssr: false });
export const Rock2 = dynamic(() => import("./Rock2"), { ssr: false });
export const Rock3 = dynamic(() => import("./Rock3"), { ssr: false });
export const Tree1 = dynamic(() => import("./Tree1"), { ssr: false });
export const Tree2 = dynamic(() => import("./Tree2"), { ssr: false });
export const Tree3 = dynamic(() => import("./Tree3"), { ssr: false });
export const Tree4 = dynamic(() => import("./Tree4"), { ssr: false });
