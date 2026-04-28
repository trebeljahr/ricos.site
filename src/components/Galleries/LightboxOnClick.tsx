import type { ImageProps } from "src/@types";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import NextJsSlideImage from "./SlideImage";

// Minimal single-photo lightbox used by the SingleImage SSR path. Lighter
// than CustomLightBox (no thumbnails, no animate-back tween) since none of
// it is meaningful for a single slide.
const LightboxOnClick = ({
  photo,
  onClose,
}: {
  photo: ImageProps & { id: string };
  onClose: () => void;
}) => {
  return (
    <Lightbox
      open
      close={onClose}
      slides={[photo]}
      carousel={{ finite: true }}
      plugins={[Zoom]}
      render={{ slide: NextJsSlideImage }}
    />
  );
};

export default LightboxOnClick;
