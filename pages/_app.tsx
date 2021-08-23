import { AppProps } from "next/app";
import "../styles/index.css";
import "../styles/vs-code-dark-theme.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
