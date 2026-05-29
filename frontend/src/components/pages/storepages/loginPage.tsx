import { useState } from 'react';
import { signIn, signInWithGoogle, resetPassword } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import '../../assets/UI/loginReg.css';
import Logo from '../../assets/logos/LZABLKTRP.webp';

const API_URL = import.meta.env.VITE_API_URL;

const UserLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
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

      // Fetch user profile from backend (also seeds Cosmos doc on first login)
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      type UserProfile = {
        user_type: string;
        full_name?: string;
        phone_number?: string;
      };
      const profile = response.data as UserProfile;

      // Redirect based on user_type
      if (profile.user_type === 'admin') {
        navigate('/commandcentre');
      } else if (profile.user_type === 'driver') {
        navigate('/driversdashboard');
      } else {
        navigate('/');
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

      // Fetch user profile from backend (also seeds Cosmos doc on first login)
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      type UserProfile = {
        user_type: string;
        full_name?: string;
        phone_number?: string;
      };
      const profile = response.data as UserProfile;

      // Redirect based on user_type
      if (profile.user_type === 'admin') {
        navigate('/commandcentre');
      } else if (profile.user_type === 'driver') {
        navigate('/driversdashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setLoading(true);
      await resetPassword(resetEmail);
      setResetEmailSent(true);
      setShowResetForm(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className='registerLogin-container'>
        <img src={Logo} alt="Logo" className='reg-logo' />
        
        {!showResetForm ? (
          <>
            <h2>Login</h2>
            <form className='app-form' onSubmit={handleSubmit}>
              <input
                name="email"
                type="email"
                placeholder="Email"
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
              <button className='app-btn' type="submit" disabled={loading} >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <button
              className='google-btn'
              type="button"
              onClick={handleGoogleSignIn}
            >
              <img width="35" height="35" src="https://img.icons8.com/fluency/48/google-logo.png" alt="google-logo"/>
              oogle Sign In
            </button>
            
            {/* Add forgot password link */}
            <div className="forgot-password">
              <button 
                type="button" 
                onClick={() => setShowResetForm(true)}
                className="forgot-password-link"
              >
                Forgot password?
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Reset Password</h2>
            <form className='app-form' onSubmit={handlePasswordReset}>
              <input
                name="resetEmail"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
              <button className='app-btn' type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setShowResetForm(false)}
              >
                Back to Login
              </button>
            </form>
          </>
        )}
        
        {resetEmailSent && (
          <div className="success-message">
            Password reset email sent! Check your inbox.
          </div>
        )}
        
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
        
        <div className='register-user'>
          New user? <a href="/register">Register here</a>
        </div>
      </div>
  );
};

export default UserLogin;