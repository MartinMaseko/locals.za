import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../assets/UI/loginReg.css';
import Logo from '../../assets/logos/LZABLKTRP.webp';

const API_URL = import.meta.env.VITE_API_URL;

const CommandLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      const response = await axios.post<{ isAdmin: boolean; token?: string }>(
        `${API_URL}/api/admin/auth`,
        { email: form.email, password: form.password },
      );

      if (response.data.isAdmin && response.data.token) {
        // Admin confirmed — store auth state and the signed token for API calls
        localStorage.setItem('commandCentreAuth', 'true');
        localStorage.setItem('commandCentreEmail', form.email);
        localStorage.setItem('authToken', response.data.token);
        navigate('/commandcentre', { replace: true });
      } else if (response.data.isAdmin && !response.data.token) {
        setError('Server did not return an auth token. Please redeploy the API.');
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
        <div className="password-wrapper">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
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
