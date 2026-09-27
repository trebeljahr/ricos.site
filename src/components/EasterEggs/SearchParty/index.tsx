import dynamic from "next/dynamic";

export const SearchPartyEgg = dynamic(() => import("./SearchPartyEgg"), {
  ssr: false,
  loading: () => <div className="mt-8 h-[55vh] min-h-80" />,
});
