import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../assets/UI/loginReg.css';
import Logo from '../../assets/logos/LZABLKTRP.webp';

const API_URL = import.meta.env.VITE_API_URL;

const CommandLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Validate against backend admin auth
      const response = await axios.post(`${API_URL}/api/admin/auth`, {
        email: form.email,
        password: form.password,
      });

      if (response.data.isAdmin) {
        // Admin confirmed — store auth state and redirect to Command Centre
        sessionStorage.setItem('commandCentreAuth', 'true');
        sessionStorage.setItem('commandCentreEmail', form.email);
        navigate('/commandcentre', { replace: true });
      } else {
        setError('Access denied. Only admin staff can log in here.');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Login failed');
      }
    }
    setLoading(false);
  };

  return (
    <div className='registerLogin-container'>
      <img src={Logo} className='reg-logo' alt="LocalsZA Logo" />
      <h2>Command Centre Login</h2>
      <form className='app-form' onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Staff Email"
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {error && <div style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>{error}</div>}

      <div className='login-redirect-user' style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px' }}>
        <a href="/">Back to LocalsZA</a>
      </div>
    </div>
  );
};

export default CommandLogin;
