import Document, { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <Script
            src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
            rel="stylesheet"
          />
        </Head>

        <body className="bg-white dark:bg-gray-900 max-w-none w-full">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
