import Head from 'next/head';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = '今晚食乜';
const DEFAULT_DESC = '快速生成一週餐單、搜尋家常食譜、整理購物清單。';
const BASE_URL = 'https://eatwhathk.com';

export default function SEO({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogImage,
  ogType = 'website',
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = canonical || BASE_URL;

  return (
    <Head>
      {/* Title */}
      <title>{fullTitle}</title>
      {noIndex && <meta name="robots" content="noindex,noarchive" />}

      {/* Canonical */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Description */}
      {description && <meta name="description" content={description} />}

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card */}
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:url" content={url} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Head>
  );
}
