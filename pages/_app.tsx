import { AppProps } from "next/app";
import "../styles/index.css";
import "../styles/navbar.css";
import "../styles/post-preview.css";
import "../styles/newsletter.css";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
