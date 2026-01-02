import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import '../buyers/buyerStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

const AddCustomer = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const auth = getAuth(app);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please login to continue');
      }

      const token = await user.getIdToken();

      await axios.post(
        `${API_URL}/api/sales/add-customer`,
        {
          customerEmail: email.trim(),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess('Customer added successfully!');
      setEmail('');
      setName('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      console.error('Error adding customer:', err);
      const errorMessage = err?.response?.data?.error || err.message || 'Failed to add customer';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2>Add New Customer</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
          Register a new customer and link them to your profile. Each customer can only be managed by one sales representative.
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212121', fontWeight: '600' }}>
              Customer Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="price-input"
              placeholder="customer@example.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212121', fontWeight: '600' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="price-input"
              placeholder="John Doe"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212121', fontWeight: '600' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="price-input"
              placeholder="+27 123 456 7890"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212121', fontWeight: '600' }}>
              Address *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="price-input"
              placeholder="123 Main Street, City, Province"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            type="submit"
            className="update-btn"
            disabled={loading}
          >
            {loading ? 'Adding Customer...' : 'Add Customer'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCustomer;
