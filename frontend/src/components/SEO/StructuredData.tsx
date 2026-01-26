import { useEffect } from 'react';

interface StructuredDataProps {
  type: string;
  data: Record<string, any>;
}

const StructuredData = ({ type, data }: StructuredDataProps) => {
  useEffect(() => {
    const scriptId = 'structured-data';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data
    };

    script.textContent = JSON.stringify(structuredData);

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [type, data]);

  return null;
};

export default StructuredData;