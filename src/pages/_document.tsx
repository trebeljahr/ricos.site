import Document, { Head, Html, Main, NextScript } from "next/document";
export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <link rel="preconnect" href="https://rsms.me/" />
          <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        </Head>

        <body className="prose dark:bg-gray-800 dark:prose-invert max-w-none hover:prose-a:text-blue">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
