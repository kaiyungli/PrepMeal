import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom document with global SEO and AdSense
 */
export default function Document() {
  return (
    <Html lang="zh-HK">
      <Head>
        {/* SEO Base */}
        <meta name="description" content="快速生成一週餐單、搜尋家常食譜、整理購物清單。" />
        
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
        
        {/* AdSense - visible in view-source */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7449807224140811"
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
