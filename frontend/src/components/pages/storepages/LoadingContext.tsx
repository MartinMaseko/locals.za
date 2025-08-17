import { createContext } from 'react';

type LoadingContextType = {
  loading: boolean;
  setLoading: (v: boolean) => void;
};

const LoadingContext = createContext<LoadingContextType>({
  loading: false,
  setLoading: () => {},
});

export default LoadingContext;