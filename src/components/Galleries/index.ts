import dynamic from "next/dynamic";

export const SimpleGallery = dynamic(import("./SimpleGallery"));
export const InfiniteScrollGallery = dynamic(import("./InfiniteScrollGallery"));
