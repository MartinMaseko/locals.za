import { useState } from 'react';
import { signIn } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UserLogin = () => {
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
      // Login with Supabase Auth
      const { data, error } = await signIn(form.email, form.password);
      if (error) throw new Error(error.message);

      // Get the access token from Supabase
      const access_token = data.session?.access_token;
      if (!access_token) throw new Error('Login failed. No session returned.');

      // type for the user profile
      type UserProfile = { user_type: string };

      // Fetch user profile from your backend
      const { data: profile } = await axios.get<UserProfile>('/api/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      // Only allow salon_owner to login here
      if (profile.user_type === 'salon_owner') {
        navigate('/'); // Redirect to homepage
      } else {
        setError('Only salon owners can log in here.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Salon Owner Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
    </div>
  );
};

export default UserLogin;