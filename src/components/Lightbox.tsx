import LightboxComponent, {
  LightboxExternalProps,
} from "yet-another-react-lightbox";
import React from "react";

import "yet-another-react-lightbox/styles.css";

export default function Lightbox(props: LightboxExternalProps) {
  return <LightboxComponent {...props} />;
}
