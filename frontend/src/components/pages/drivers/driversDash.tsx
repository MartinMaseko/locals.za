import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';

interface UserProfile {
  full_name: string;
  phone_number: string;
  profile_picture_url: string;
  email: string;
}

interface DriverProfile {
  vehicle_type: string;
  vehicle_registration: string;
  bank_account_details: string;
}

const DriversDash = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const checkProfiles = async () => {
      try {
        const token = await user.getIdToken();

        // Fetch user profile
        const { data: userData } = await axios.get<UserProfile>('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!userData.full_name || !userData.phone_number || !userData.profile_picture_url) {
          navigate('/userprofile');
          return;
        }
        setUserProfile(userData);

        // Fetch driver profile
        const { data: driverData } = await axios.get<DriverProfile>('/api/drivers/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (
          !driverData.vehicle_type ||
          !driverData.vehicle_registration ||
          !driverData.bank_account_details
        ) {
          navigate('/driverprofile');
          return;
        }
        setDriverProfile(driverData);

        setLoading(false);
      } catch (err) {
        navigate('/login');
      }
    };

    checkProfiles();
  }, [navigate]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>
        Welcome to the Driver Dashboard{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}
      </h1>
      <p>Your driver profile is complete. You can now access all driver features.</p>
      {driverProfile && (
        <div style={{ marginTop: 20 }}>
          <strong>Vehicle Type:</strong> {driverProfile.vehicle_type}
        </div>
      )}
    </div>
  );
};

export default DriversDash;