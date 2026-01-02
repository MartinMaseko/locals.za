import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../../Auth/firebaseClient';
import axios from 'axios';
import Logo from '../../assets/logos/LZABLKTRP.webp';
import '../../../components/assets/UI/loginReg.css';

const API_URL = import.meta.env.VITE_API_URL;

interface SalesLoginResponse {
  success: boolean;
  token: string;
  salesRepId: string;
  username: string;
}

const SalesLogin = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Step 1: Authenticate with backend to get custom token
      const { data } = await axios.post<SalesLoginResponse>(`${API_URL}/api/sales/login`, {
        username: form.username,
        password: form.password
      });

      if (!data.success || !data.token) {
        throw new Error('Login failed. No token returned.');
      }

      // Step 2: Sign in to Firebase with the custom token
      await signInWithCustomToken(auth, data.token);

      // Step 3: Store sales rep info in localStorage
      localStorage.setItem('salesRepId', data.salesRepId);
      localStorage.setItem('salesRepUsername', data.username);

      // Step 4: Navigate to sales dashboard
      navigate('/sales/add-customer');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.response?.data?.error || err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className='registerLogin-container'>
      <img src={Logo} className='reg-logo' alt="Logo" />
      <h2>Sales Rep Login</h2>
      <form className='app-form' onSubmit={handleSubmit}>
        <input
          name="username"
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button className='app-btn' type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
      {error && <div className='sales-login-error'>{error}</div>}
    </div>
  );
};

export default SalesLogin;
