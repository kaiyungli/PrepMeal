import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom document with AdSense in <head> for verification
 * This makes adsbygoogle.js visible in view-source
 */

export default function Document() {
  return (
    <Html lang="zh-HK">
      <Head>
        {/* AdSense for site verification - visible in view-source */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7449807221408111"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
