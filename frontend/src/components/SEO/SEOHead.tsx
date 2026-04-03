import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEOHead = ({
  title = 'LocalsZA - Online Cash & Carry| Wholesaler buyer & delivery service for Retail & SMMEs | Ekhuruleni',
  description = 'Retail shop, Hair Salon and Fast Food Outlet Online Cash and Carry, buyer service and delivery for SMMEs in Ekhuruleni. Order wholesale supplies online.',
  keywords = 'retail shop, online wholesaler, online cash and carry, Buyer Service, SMME supplier, Ekhuruleni, Gauteng, LocalsZA',
  image = 'https://locals-za.co.za/assets/logos/LZA ICON.png',
  url,
  type = 'website'
}: SEOHeadProps) => {
  const location = useLocation();
  const currentUrl = url || `https://locals-za.co.za${location.pathname}`;

  useEffect(() => {
    document.title = title;

    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:type', type, true);
  }, [title, description, keywords, image, currentUrl, type]);

  return null;
};

export default SEOHead;