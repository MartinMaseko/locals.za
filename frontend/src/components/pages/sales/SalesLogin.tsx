import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../../assets/logos/LZABLKTRP.webp';
import '../../../components/assets/UI/loginReg.css';

const API_URL = import.meta.env.VITE_API_URL;

interface SalesLoginResponse {
  success: boolean;
  salesRepId: string;
  username: string;
  email: string;
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
      console.log('SalesLogin - Attempting login with:', { username: form.username });
      
      // Simple credential verification
      const { data } = await axios.post<SalesLoginResponse>(
        `${API_URL}/api/sales/login`,
        {
          username: form.username,
          password: form.password
        }
      );

      console.log('SalesLogin - Login response:', data);

      if (!data.success) {
        throw new Error('Login failed');
      }

      // Clear any existing data first
      localStorage.clear();

      // Store sales rep info in localStorage
      localStorage.setItem('salesRepId', data.salesRepId);
      localStorage.setItem('salesRepUsername', data.username);
      localStorage.setItem('salesRepEmail', data.email);
      localStorage.setItem('userType', 'sales_rep');

      // Verify the data was stored
      const storedId = localStorage.getItem('salesRepId');
      const storedUsername = localStorage.getItem('salesRepUsername');
      
      console.log('SalesLogin - Stored data:', {
        salesRepId: storedId,
        salesRepUsername: storedUsername
      });

      // Use window.location instead of navigate to force a complete page reload
      window.location.href = '/sales/add-customer';
      
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
