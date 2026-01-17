import { useState } from 'react';
import axios from 'axios';
import '../buyers/buyerStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface LinkCustomerResponse {
  success: boolean;
  message: string;
  customer: Customer;
}

const AddCustomer = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCustomerInfo(null);
    setLoading(true);

    try {
      // Get salesRepId from localStorage instead of Firebase Auth
      const salesRepId = localStorage.getItem('salesRepId');
      if (!salesRepId) {
        throw new Error('Please login to continue');
      }

      // Link existing customer to sales rep
      const response = await axios.post<LinkCustomerResponse>(
        `${API_URL}/api/sales/customers`,  
        {
          email: email.trim()           
        },
        {
          headers: {
            Authorization: `Bearer ${salesRepId}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess(response.data.message || 'Customer successfully linked!');
        setCustomerInfo(response.data.customer);
        setEmail('');
      } else {
        setError(response.data.message || 'Failed to link customer');
      }
    } catch (err: any) {
      console.error('Error linking customer:', err);
      console.error('Response data:', err?.response?.data);
      const errorMessage = err?.response?.data?.error || err.message || 'Failed to link customer';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2>Link Customer to Your Profile</h2>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ color: '#495057', marginBottom: '1rem' }}>How it works:</h3>
            <ol style={{ color: '#6c757d', lineHeight: '1.6' }}>
              <li>Customer registers on the LocalsZA app first</li>
              <li>You enter their registered email below to link them to your profile</li>
              <li>Once linked, you can view their orders and earn R10 per order</li>
              <li>Each customer can only be linked to one sales representative</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212121', fontWeight: '600' }}>
                Customer's Registered Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="price-input"
                placeholder="Enter the email they used to register"
              />
              <small style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                Make sure this is the exact email they used to create their LocalsZA account
              </small>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {success && (
              <div className="success-message" style={{ marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            {customerInfo && (
              <div style={{ 
                backgroundColor: '#d4edda', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                border: '1px solid #c3e6cb'
              }}>
                <h4 style={{ color: '#155724', marginBottom: '0.5rem' }}>Customer Linked Successfully!</h4>
                <p style={{ color: '#155724', margin: 0 }}>
                  <strong>{customerInfo.name}</strong> ({customerInfo.email}) is now linked to your profile.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="update-btn"
              disabled={loading}
            >
              {loading ? 'Linking Customer...' : 'Link Customer'}
            </button>
          </form>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#fff3cd', 
            borderRadius: '8px',
            border: '1px solid #ffeaa7'
          }}>
            <h4 style={{ color: '#856404', marginBottom: '0.5rem' }}>Need Help?</h4>
            <p style={{ color: '#856404', fontSize: '0.875rem', margin: 0 }}>
              If the customer hasn't registered yet, ask them to download the LocalsZA app and create an account first. 
              Then come back here to link them using their registered email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCustomer;
