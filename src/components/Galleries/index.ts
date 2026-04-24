import dynamic from "next/dynamic";

export const SimpleGallery = dynamic(() => import("./SimpleGallery"), { ssr: false });
export const InfiniteScrollGallery = dynamic(() => import("./InfiniteScrollGallery"), {
  ssr: false,
});
