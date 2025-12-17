import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../../../Auth/authService';
import axios from 'axios';
import Logo from '../../assets/logos/LZABLKTRP.webp';
import '../../../components/assets/UI/loginReg.css';

const API_URL = import.meta.env.VITE_API_URL;

const BuyerLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
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
      const userCredential = await signIn(form.email, form.password);
      // Get the token - same way as AdminLogin
      const access_token = (userCredential as any).access_token || (userCredential as any).accessToken;
      if (!access_token) throw new Error('Login failed. No access token returned.');

      // Fetch user profile to check if admin (ADMIN ONLY for buyer dashboard)
      const { data: profile } = await axios.get<{ user_type: string }>(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      // ADMIN ONLY - buyers use this dashboard for bulk purchasing
      if (profile.user_type === 'admin') {
        navigate('/buyer/orders');
      } else {
        setError('Access denied. Only admin accounts can access the buyer dashboard.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className='registerLogin-container'>
      <img src={Logo} className='reg-logo' alt="Logo" />
      <h2>Buyer Dashboard</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
        Admin access only
      </p>
      <form className='app-form' onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
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
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
    </div>
  );
};

export default BuyerLogin;