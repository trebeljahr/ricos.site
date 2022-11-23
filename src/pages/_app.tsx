import { AppProps } from "next/app";
import { MDXProvider } from "@mdx-js/react";
import {
  HeadingRenderer,
  ImageRenderer,
  LinkRenderer,
  ParagraphRenderer,
} from "../components/CustomRenderers";
import "../styles/index.css";
import "../styles/highlight.css";
import "../styles/navbar.css";
import "../styles/post-preview.css";
import "../styles/newsletter.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MDXProvider
      components={{
        img: ImageRenderer,
        a: LinkRenderer,
        p: ParagraphRenderer,
        h1: HeadingRenderer(1),
        h2: HeadingRenderer(2),
        h3: HeadingRenderer(3),
        h4: HeadingRenderer(4),
        h5: HeadingRenderer(5),
        h6: HeadingRenderer(6),
      }}
    >
      <Component {...pageProps} />
    </MDXProvider>
  );
}
