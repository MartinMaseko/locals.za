import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import axios from 'axios';
import Logo from '../../../assets/logos/LZAWHTTRP.webp';
import '../../../assets/UI/loginReg.css';

type VerifyCredentialsResponse = {
  firebase_uid: string;
  driver_id: string;
  email?: string;
  success?: boolean;
  [key: string]: any;
};

type LoginLinkResponse = {
  temporaryPassword: string;
  customToken: string;
  success?: boolean;
  [key: string]: any;
};

const DriverLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    driver_id: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Verify driver credentials
      const verifyResponse = await axios.post<VerifyCredentialsResponse>('/api/drivers/verify-credentials', {
        full_name: formData.full_name,
        driver_id: formData.driver_id
      });

      // Check if we have the firebase_uid - that's all we need for custom token auth
      if (!verifyResponse.data || !verifyResponse.data.firebase_uid) {
        throw new Error('Failed to verify driver credentials');
      }

      // Step 2: Get temporary login credentials
      const { firebase_uid } = verifyResponse.data;
      
      const loginResponse = await axios.post<LoginLinkResponse>('/api/drivers/login-link', {
        driver_id: formData.driver_id,
        firebase_uid: firebase_uid
      });

      // Check if we have the login response
      if (!loginResponse.data) {
        throw new Error('Failed to generate login credentials');
      }

      // Try to authenticate with custom token (preferred method)
      if (loginResponse.data.customToken) {
        try {
          await signInWithCustomToken(auth, loginResponse.data.customToken);
          navigate('/driversdashboard');
          return;
        } catch (customTokenError) {
          // Fall back to email/password if available
        }
      }

      // Fall back to email/password if we have both email and temporaryPassword
      if (loginResponse.data.temporaryPassword && verifyResponse.data.email) {
        const temporaryPassword = loginResponse.data.temporaryPassword;
        const email = verifyResponse.data.email;

        try {
          // Ensure email is a string and not undefined or null
          if (typeof email !== 'string' || !email.includes('@')) {
            throw new Error('Invalid email format');
          }
          
          await signInWithEmailAndPassword(auth, email, temporaryPassword);
          navigate('/driversdashboard');
        } catch (emailPassError: any) {
          throw emailPassError;
        }
      } else {
        if (!loginResponse.data.customToken) {
          throw new Error('No authentication method available');
        }
      }
    } catch (err: any) {
      // Handle different error types
      if (err.response) {
        // Server responded with an error status
        if (err.response.status === 401) {
          setError('Invalid driver credentials. Please check your name and driver ID.');
        } else if (err.response.status === 403) {
          setError('Access denied. Your account may be disabled.');
        } else {
          setError(err.response.data?.error || 'Login failed. Please try again.');
        }
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Authentication failed. Please contact support.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError('Driver account not properly set up. Please contact support.');
      } else if (err.code === 'auth/missing-email') {
        setError('Missing email information. Please contact support.');
      } else if (err.request) {
        // Request was made but no response
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Error setting up request
        setError('Login failed. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registerLogin-container driver-login-container">
      <img src={Logo} alt="Locals ZA" className="reg-logo" />
      
      <h1>Driver Login</h1>
      <p className="driver-login-subtitle">Access your delivery dashboard</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="app-form driver-login-form">
        <div className="form-group">
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="app-input"
          />
        </div>
        
        <div className="form-group">
          <input
            type="text"
            name="driver_id"
            value={formData.driver_id}
            onChange={handleChange}
            placeholder="Driver ID"
            required
            className="app-input"
          />
        </div>
        
        <button 
          type="submit" 
          className="app-btn"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <div className="login-redirect-user">
        <p>Customer? <Link to="/login">Sign in here</Link></p>
      </div>
      
      <div className="driver-help">
        <p>Need help? Contact your administrator or support at <strong>support@locals-za.co.za</strong></p>
      </div>
    </div>
  );
};

export default DriverLogin;