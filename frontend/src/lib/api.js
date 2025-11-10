import axios from 'axios';
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '',
    timeout: 10000,
});
export default API;
