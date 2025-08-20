import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth';

    if (hash) {
      // give browser a tick to resolve element
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) (el as HTMLElement).scrollIntoView({ behavior, block: 'start' });
        else window.scrollTo({ top: 0, left: 0, behavior });
      }, 0);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior });
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;