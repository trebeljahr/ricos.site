import { ImageWithLoader } from "@components/ImageWithLoader";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { ImageProps } from "src/@types";
import { resolveAlt } from "src/lib/imageAlt";
import { openWithLightboxTransition } from "src/lib/lightboxTransition";
import { addIdAndIndex } from "src/lib/utils/misc";

// Lightbox is heavy (yet-another-react-lightbox + plugins) and only
// needed once the user actually clicks the image.
const LightboxOnClick = dynamic(() => import("./LightboxOnClick"), { ssr: false });

// Renders a single inline image with explicit width/height so the
// browser reserves space immediately. Replaces the SimpleGallery /
// RowsPhotoAlbum path for the photos.length === 1 case where the album
// layout otherwise reflows on hydration and produces CLS.
const SingleImage = ({ photo: rawPhoto }: { photo: ImageProps }) => {
  const photo = addIdAndIndex(rawPhoto, 0);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        // Warm the lightbox chunk so it can render inside the morph's wait window.
        onPointerEnter={() => void import("./LightboxOnClick")}
        onClick={(e) =>
          openWithLightboxTransition(() => setOpen(true), e.currentTarget.querySelector("img"), e)
        }
        aria-label={photo.alt ? `Open image: ${photo.alt}` : "Open image"}
        className="block w-full p-0 m-0 border-0 bg-transparent cursor-zoom-in"
      >
        <ImageWithLoader
          id={photo.id}
          src={photo.src}
          alt={resolveAlt(photo.src, photo.alt)}
          width={photo.width}
          height={photo.height}
          // Same measured `max-w-prose` column as MarkdownRenderers' img.
          sizes="(max-width: 768px) calc(100vw - 24px), (max-width: 1279px) 651px, 723px"
          style={{ width: "100%", height: "auto" }}
        />
      </button>
      {open && <LightboxOnClick photo={photo} onClose={() => setOpen(false)} />}
    </>
  );
};

export default SingleImage;
