import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  product?: {
    name: string;
    description: string;
    image: string;
    price: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    sku?: string;
    brand?: string;
  };
}

export function SEO({ title, description, image, url, type = 'website', product }: SEOProps) {
  useEffect(() => {
    const fullTitle = `${title} | ZK REZK`;
    document.title = fullTitle;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMeta('description', description);
    updateMeta('og:title', fullTitle, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', type, true);
    updateMeta('twitter:title', fullTitle, true);
    updateMeta('twitter:description', description, true);

    if (image) {
      updateMeta('og:image', image, true);
      updateMeta('twitter:image', image, true);
    }

    if (url) {
      updateMeta('og:url', url, true);
    }

    if (product) {
      updateMeta('product:price:amount', String(product.price / 100), true);
      updateMeta('product:price:currency', product.currency || 'BRL', true);
    }

    return () => {
      document.title = 'ZK REZK - Joalheria de Luxo';
    };
  }, [title, description, image, url, type, product]);

  return null;
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  sku?: string;
  brand?: string;
  url?: string;
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency = 'BRL',
  availability = 'InStock',
  sku,
  brand = 'ZK REZK',
  url,
}: ProductSchemaProps) {
  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image,
      brand: {
        '@type': 'Brand',
        name: brand,
      },
      offers: {
        '@type': 'Offer',
        price: (price / 100).toFixed(2),
        priceCurrency: currency,
        availability: `https://schema.org/${availability}`,
        url: url || window.location.href,
      },
      ...(sku && { sku }),
    };

    let script = document.getElementById('product-jsonld') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'product-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    return () => {
      const existingScript = document.getElementById('product-jsonld');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [name, description, image, price, currency, availability, sku, brand, url]);

  return null;
}
