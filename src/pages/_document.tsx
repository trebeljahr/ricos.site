import Document, { Head, Html, Main, NextScript } from "next/document";

const cloudfrontId = process.env.NEXT_PUBLIC_CLOUDFRONT_ID;
const cloudfrontOrigin = cloudfrontId ? `https://${cloudfrontId}.cloudfront.net` : null;

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          {/* Warm DNS+TCP+TLS to CloudFront before any image request fires.
              Saves ~100-200ms on cold visits — every page hits this origin
              for cover/inline images. */}
          {cloudfrontOrigin && <link rel="preconnect" href={cloudfrontOrigin} crossOrigin="" />}
        </Head>

        <body className="prose md:prose-lg xl:prose-xl bg-white dark:bg-gray-900 dark:prose-invert max-w-none prose-img:m-0 w-full">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
