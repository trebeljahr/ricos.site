import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";
import type { RandomPhoto } from "src/pages/api/random-photo";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";
import type { EggPhoto } from ".";

const POLAROID_WIDTH = 184;
const DEVELOP_MS = 2600;

type Print = { photo: EggPhoto; left: number; top: number };

/** A random photo from the whole collection; null if the request fails. */
async function fetchRandomPhoto(): Promise<EggPhoto | null> {
  try {
    const res = await fetch("/api/random-photo");
    if (!res.ok) return null;
    const { src, tripName } = (await res.json()) as RandomPhoto;
    return src ? { tripName, image: { src } } : null;
  } catch {
    return null;
  }
}

/** Without the API, fall back to the featured trip covers the page already has. */
function pickFallback(photos: EggPhoto[], last: string | null) {
  const candidates = photos.filter(({ image }) => image.src !== last);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const PhotographyEgg = ({ photos }: { photos: EggPhoto[] }) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const cameraRef = useRef<HTMLSpanElement>(null);
  const lastPhoto = useRef<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [print, setPrint] = useState<Print | null>(null);

  const registerClick = useEasterEgg("photography", {
    onTrigger: () =>
      run(async () => {
        if (!cameraRef.current) return;
        // Fetch while the flash plays, so the print is ready when it ends.
        const photoRequest = fetchRandomPhoto();

        if (!reduceMotion) {
          setFlash(true);
          await wait(160);
          setFlash(false);
        }

        const photo = (await photoRequest) ?? pickFallback(photos, lastPhoto.current);
        if (!photo || !cameraRef.current) return;
        lastPhoto.current = photo.image.src;

        const camera = pageBox(cameraRef.current);
        setPrint({
          photo,
          left: clampPageX(camera.left + camera.width / 2 - POLAROID_WIDTH / 2, POLAROID_WIDTH),
          top: camera.top + camera.height + 8,
        });
        await wait(DEVELOP_MS + 3000);
        setPrint(null);
        await wait(400);
      }),
  });

  return (
    <>
      Photography{" "}
      <EmojiButton
        label="Camera"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={cameraRef}>📸</span>
      </EmojiButton>
      <PageLayer>
        {flash && (
          // One soft flash: 160ms, peaking at 55% white.
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{ duration: 0.16, times: [0, 0.2, 1], ease: "easeOut" }}
          />
        )}
        <AnimatePresence>
          {print && (
            <motion.figure
              key={print.photo.image.src}
              aria-hidden="true"
              className="absolute m-0 bg-white p-2 pb-1 text-base font-normal shadow-xl ring-1 ring-black/5"
              style={{ left: print.left, top: print.top, width: POLAROID_WIDTH, rotate: -3 }}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -36, scaleY: 0.4 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="relative aspect-square w-full overflow-hidden bg-gray-200"
                initial={reduceMotion ? false : { filter: "grayscale(1) brightness(1.25)" }}
                animate={{ filter: "grayscale(0) brightness(1)" }}
                transition={{ duration: DEVELOP_MS / 1000, ease: "easeInOut" }}
              >
                <Image
                  src={print.photo.image.src}
                  alt=""
                  fill
                  sizes={`${POLAROID_WIDTH}px`}
                  loading="eager"
                  className="object-cover"
                />
              </motion.div>
              <figcaption className="py-1.5 text-center text-sm text-gray-700">
                {turnKebabIntoTitleCase(print.photo.tripName)}
              </figcaption>
            </motion.figure>
          )}
        </AnimatePresence>
      </PageLayer>
    </>
  );
};

export default PhotographyEgg;
