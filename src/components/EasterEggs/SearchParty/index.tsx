import dynamic from "next/dynamic";

export const SearchPartyEgg = dynamic(() => import("./SearchPartyEgg"), { ssr: false });
