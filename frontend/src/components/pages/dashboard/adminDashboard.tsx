import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';

interface AdminProfile {
  full_name?: string;
  email: string;
  user_type: string;
}

const AdminDashboard = () => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
      navigate('/adminlogin');
      return;
    }

    const fetchAdmin = async () => {
      try {
        const token = await user.getIdToken();
        const { data } = await axios.get<AdminProfile>('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (data.user_type !== 'admin') {
          navigate('/adminlogin');
          return;
        }
        setAdmin(data);
      } catch {
        navigate('/adminlogin');
      }
      setLoading(false);
    };

    fetchAdmin();
  }, [navigate]);

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>
        Welcome, {admin?.full_name ? admin.full_name : admin?.email} (Admin)
      </h1>
      <p>You have access to the admin dashboard.</p>
    </div>
  );
};

export default AdminDashboard;