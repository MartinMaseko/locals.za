import { useState } from 'react';
import { signUp, signInWithGoogle } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UserRegistration = () => {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone_number: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Register with Firebase Auth
      const userCredential = await signUp(form.email, form.password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      // Save extra profile info to backend
      await axios.post('/api/users/register', {
        full_name: form.full_name,
        phone_number: form.phone_number,
        user_type: 'customer',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate('/'); // Redirect to welcome page
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const token = await user.getIdToken();

      // Save extra profile info to backend (if needed, you can prompt for full_name/phone_number after Google sign up)
      await axios.post('/api/users/register', {
        full_name: user.displayName || '',
        phone_number: '', // You may want to prompt for this if not available
        user_type: 'customer',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google sign up failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Register</h2>
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
        <input
          name="full_name"
          type="text"
          placeholder="Full Name"
          value={form.full_name}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="phone_number"
          type="tel"
          placeholder="Phone Number"
          value={form.phone_number}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        style={{
          width: '100%',
          marginTop: 10,
          background: '#4285F4',
          color: '#fff',
          border: 'none',
          padding: 10,
          borderRadius: 4,
        }}
      >
        Sign up with Google
      </button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
    </div>
  );
};

export default UserRegistration;