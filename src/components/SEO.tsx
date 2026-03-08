import { Helmet } from 'react-helmet-async';
import { AR } from '@/lib/i18n';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title, 
  description = AR.app.description, 
  image = 'https://shopydash.store/logo.png', 
  url = 'https://shopydash.store',
  type = 'website'
}: SEOProps) {
  const siteTitle = title ? `${title} | Shopydash` : 'شوبي داش | تسوق محلي سهل وسريع';

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook tags */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
