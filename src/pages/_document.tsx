import Document, { Head, Html, Main, NextScript } from "next/document";
export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <link rel="preconnect" href="https://rsms.me/" />
          <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        </Head>

        <body className="prose dark:primary-dark dark:prose-invert hover:prose-a:text-blue max-w-none">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
