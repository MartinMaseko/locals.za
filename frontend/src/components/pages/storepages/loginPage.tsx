import { useState } from 'react';
import { signIn, signInWithGoogle } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';

const UserLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Google sign-in failed');
      const token = await user.getIdToken();

      // Fetch user profile from backend
      const response = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Define a type for the user profile
      type UserProfile = {
        user_type: string;
        full_name?: string;
        phone_number?: string;
        // add other fields if needed
      };
      const profile = response.data as UserProfile;

      // Redirect based on user_type
      if (profile.user_type === 'customer') {
        if (!profile.full_name || !profile.phone_number) {
          navigate('/userprofile');
        } else {
          navigate('/');
        }
      } else if (profile.user_type === 'driver') {
        navigate('/driversdashboard');
      } else {
        setError('Only customers and drivers can log in here.');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    }
    setLoading(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Login with Firebase Auth
      const userCredential = await signIn(form.email, form.password);
      const user = userCredential.user;
      if (!user) throw new Error('Login failed. No user returned.');
      const token = await user.getIdToken();

      // Fetch user profile from backend
      const response = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      type UserProfile = {
        user_type: string;
        full_name?: string;
        phone_number?: string;
        // add other fields if needed
      };
      const profile = response.data as UserProfile;

      // Redirect based on user_type
      if (profile.user_type === 'customer') {
        if (!profile.full_name || !profile.phone_number) {
          navigate('/userprofile');
        } else {
          navigate('/');
        }
      } else if (profile.user_type === 'driver') {
        navigate('/driversdashboard');
      } else if (profile.user_type === 'admin') {
        navigate('/admindashboard');
      } else {
        setError('Only customers, drivers, and admins can log in here.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Login</h2>
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
      <button
        type="button"
        onClick={handleGoogleSignIn}
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
        Sign in with Google
      </button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
    </div>
  );
};

export default UserLogin;