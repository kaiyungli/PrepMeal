import { Html, Head, Main, NextScript } from 'next/document';
import { ADSENSE_CLIENT_ID } from '@/constants/ads';

/**
 * Custom document with SEO and non-executing AdSense verification
 */
export default function Document() {
  return (
    <Html lang="zh-HK">
      <Head>
        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="今晚食乜" />
        <meta property="og:locale" content="zh_HK" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#9B6035" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
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
