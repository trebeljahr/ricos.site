import type { AppProps } from "next/app";
import Head from "next/head";
import PlausibleProvider from "next-plausible";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import { installHistoryTracking } from "src/lib/historyState";
import "../styles/globals.css";

// next/font/google previously loaded Inter and passed `inter.className` as
// a prop to page components, but no page component actually applies that
// prop — so the 49KB woff2 was preloaded at high priority on every page
// and never rendered. globals.css already lists InterVariable / Inter as
// the preferred families with system-font fallbacks; the visible result
// for users is unchanged.

// Safari on macOS and iPadOS paints the overscroll area with theme-color
// whenever one is set, not with the page background. In dark mode use the
// header's gray-900 (see `.dark .glassy`) so pulling past the top or bottom
// edge shows the header/footer color instead of black. The server renders the
// default dark theme; light mode keeps its old black value.
function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  return (
    <Head>
      <meta name="theme-color" content={resolvedTheme === "light" ? "#000" : "#111827"} />
    </Head>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    return installHistoryTracking();
  }, []);

  return (
    <>
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <meta name="msapplication-TileColor" content="#000000" />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/rss.xml"
          title="ricos.site RSS Feed"
        />
      </Head>

      <PlausibleProvider
        // First-party proxy of plausible.trebeljahr.com, see rewrites in next.config.mjs.
        src="/kestrel/k.js"
        scriptProps={
          {
            "data-domain": "ricos.site",
            "data-api": "/kestrel/k",
          } as React.ScriptHTMLAttributes<HTMLScriptElement>
        }
        enabled={process.env.NODE_ENV === "production"}
      >
        <ThemeProvider attribute="class" enableSystem={false} defaultTheme="dark">
          <ThemeColorMeta />
          <Component {...pageProps} />
        </ThemeProvider>
      </PlausibleProvider>
    </>
  );
}
