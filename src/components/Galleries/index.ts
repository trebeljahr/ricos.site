import dynamic from "next/dynamic";

// SimpleGallery uses RowsPhotoAlbum which lays out from container width
// at hydration time (not SSR-friendly for 1-photo CLS). Multi-image case
// stays client-only.
export const SimpleGallery = dynamic(() => import("./SimpleGallery"), { ssr: false });
// SingleImage is SSR-rendered with explicit width/height so the browser
// reserves layout space immediately — no CLS when it hydrates.
export { default as SingleImage } from "./SingleImage";
export const InfiniteScrollGallery = dynamic(() => import("./InfiniteScrollGallery"), {
  ssr: false,
});
