import { createContext } from 'react';
const LoadingContext = createContext({
    loading: false,
    setLoading: () => { },
});
export default LoadingContext;
