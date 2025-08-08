import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';

const HomePage = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        try {
          const { data } = await axios.get('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userData = data as { full_name?: string; email?: string };
          setName(userData.full_name || userData.email || '');
        } catch {
          setName(user.email || '');
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>
        Welcome{ name ? `, ${name}` : '' }!
      </h1>
      <p>This is your home page.</p>
    </div>
  );
};

export default HomePage;