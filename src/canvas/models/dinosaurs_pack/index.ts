import dynamic from "next/dynamic";

const opts = { ssr: false };

export const Apatosaurus = dynamic(() => import("./Apatosaurus"), opts);
export const Parasaurolophus = dynamic(() => import("./Parasaurolophus"), opts);
export const Stegosaurus = dynamic(() => import("./Stegosaurus"), opts);
export const Trex = dynamic(() => import("./Trex"), opts);
export const Triceratops = dynamic(() => import("./Triceratops"), opts);
export const Velociraptor = dynamic(() => import("./Velociraptor"), opts);
