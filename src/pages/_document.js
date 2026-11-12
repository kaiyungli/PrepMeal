import { Html, Head, Main, NextScript } from 'next/document';
import brandMark from '@/constants/brandMark.json';
import { version as iconVersion } from '@/constants/brandIconVersion.json';
import { ADSENSE_CLIENT_ID } from '@/constants/ads';

/**
 * Custom document with SEO and non-executing AdSense verification
 */
export default function Document() {
  return (
    <Html lang="zh-HK">
      <Head>
        {/* OpenGraph */}
        <meta property="og:site_name" content="今晚食乜" />
        <meta property="og:locale" content="zh_HK" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        
        {/* Theme Color */}
        <meta name="theme-color" content={brandMark.color} />
        
        {/* Favicon */}
        <link rel="icon" href={`/favicon.ico?v=${iconVersion}`} sizes="16x16 32x32 48x48" type="image/x-icon" />
        <link rel="icon" href={`/favicon.svg?v=${iconVersion}`} type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href={`/apple-touch-icon.png?v=${iconVersion}`} sizes="180x180" />
        
        {/* Non-executing ownership verification, including ad-free pages. */}
        <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
