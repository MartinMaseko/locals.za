import { useState } from 'react';
import { signUp } from '../../../Auth/authService';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserRegistration = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    try {
      // Register user with Supabase Auth
      const { data, error } = await signUp(form.email, form.password);
      if (error) throw new Error(error.message);

      // Get the access token from Supabase
      const access_token = data.session?.access_token;
      if (!access_token) throw new Error('Registration failed. No session returned.');

      // Save extra user info to your backend (user_type, full_name, phone_number)
      await axios.post(
        '/api/users/register', 
        {
          email: form.email,
          full_name: form.full_name,
          phone_number: form.phone_number,
          user_type: 'salon_owner',
        },
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      setSuccess('Registration successful! Please check your email to verify your account.');
      setForm({ email: '', password: '', full_name: '', phone_number: '' });
      navigate('/'); // Redirect to homepage after successful registration
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Salon Owner Registration</h2>
      <form onSubmit={handleSubmit}>
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
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 10 }}>{success}</div>}
    </div>
  );
};

export default UserRegistration;