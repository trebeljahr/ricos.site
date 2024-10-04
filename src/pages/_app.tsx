import { MDXProvider } from "@mdx-js/react";
import { AppProps } from "next/app";
import {
  HeadingRenderer,
  ImageRenderer,
  LinkRenderer,
  ParagraphRenderer,
} from "@components/CustomRenderers";
import React from "react";
import "../styles/globals.css";
import "../styles/highlight.css";
import "../styles/index.css";
import "../styles/navbar.css";
import "../styles/newsletter.css";
import "../styles/post-preview.css";

import Head from "next/head";
import Script from "next/script";
import { ThemeProvider } from "next-themes";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-094TFMBB0J"
      />
      <Script id="gtaginit">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-094TFMBB0J');
       `}
      </Script>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link
          rel="mask-icon"
          href="/favicon/safari-pinned-tab.svg"
          color="#000000"
        />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="msapplication-config"
          content="/favicon/browserconfig.xml"
        />
        <meta name="theme-color" content="#000" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </Head>
      <ThemeProvider attribute="class">
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
      </ThemeProvider>
    </>
  );
}
