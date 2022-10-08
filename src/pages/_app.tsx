import { AppProps } from "next/app";
import "../styles/index.css";
import "../styles/highlight.css";
import "../styles/navbar.css";
import "../styles/post-preview.css";
import "../styles/newsletter.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
