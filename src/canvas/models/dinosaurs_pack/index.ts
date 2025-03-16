import dynamic from "next/dynamic";

export const Apatosaurus = dynamic(() => import("./Apatosaurus"));
export const Parasaurolophus = dynamic(() => import("./Parasaurolophus"));
export const Stegosaurus = dynamic(() => import("./Stegosaurus"));
export const Trex = dynamic(() => import("./Trex"));
export const Triceratops = dynamic(() => import("./Triceratops"));
export const Velociraptor = dynamic(() => import("./Velociraptor"));
