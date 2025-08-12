import { useState } from 'react';
import { signIn } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/logos/LZABLKTRP.webp';

const AdminLogin = () => {
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
      console.log('userCredential:', userCredential); // Debug line
      const access_token = (userCredential as any).access_token || (userCredential as any).accessToken;
      if (!access_token) throw new Error('Login failed. No access token returned.');

      // Fetch user profile to check if admin
      const { data: profile } = await axios.get<{ user_type: string }>('/api/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (profile.user_type === 'admin') {
        navigate('/admindashboard');
      } else {
        setError('Access denied. Not an admin user.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <img src={Logo} className='reg-logo' alt="Logo" />
      <h2>Admin Login</h2>
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
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
    </div>
  );
};

export default AdminLogin;