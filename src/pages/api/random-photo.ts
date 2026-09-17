import type { NextApiRequest, NextApiResponse } from "next";
import { getLocalMetadata, photographyFolder } from "src/lib/imageMetadata";

export type RandomPhoto = { src: string; tripName: string };

const IMAGE_PATTERN = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
let photoKeys: string[] | null = null;

/** Every photo in every trip gallery, from the same metadata the galleries read. */
function getPhotoKeys() {
  photoKeys ??= Object.keys(getLocalMetadata()).filter(
    (key) => key.startsWith(photographyFolder) && IMAGE_PATTERN.test(key),
  );
  return photoKeys;
}

/** One random photo from the photography collection, for the photography easter egg. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const keys = getPhotoKeys();
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (!key) return res.status(404).json({ message: "No photos" });

    res.setHeader("Cache-Control", "no-store");
    const body: RandomPhoto = {
      src: `/${key}`,
      tripName: key.slice(photographyFolder.length).split("/")[0],
    };
    return res.status(200).json(body);
  } catch {
    return res.status(500).json({ message: "Photos unavailable" });
  }
}
