import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../Auth/firebaseClient';

interface UserProfile {
  full_name: string;
  phone_number: string;
  profile_picture_url: string;
  email: string;
}

const UserProfile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone_number: '',
    profile_picture_url: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch current user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        let token = '';
        if (user) token = await user.getIdToken();

        const { data } = await axios.get<UserProfile>('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile({
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          profile_picture_url: data.profile_picture_url || '',
          email: data.email || (user && user.email ? user.email : ''),
        });
      } catch (err: any) {
        setError('Failed to load profile');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Handle profile image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    let imageUrl = profile.profile_picture_url;

    try {
      // If a new image is selected, upload it to Firebase Storage
      if (imageFile && profile.email) {
        const storage = getStorage(app);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${profile.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
        const imageRef = ref(storage, `profile-images/${fileName}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Update user profile in your backend
      const auth = getAuth(app);
      const user = auth.currentUser;
      let token = '';
      if (user) token = await user.getIdToken();

      await axios.put('/api/users/me', {
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        profile_picture_url: imageUrl,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Profile updated successfully!');
      setProfile((prev) => ({ ...prev, profile_picture_url: imageUrl }));
      setImageFile(null);
    } catch (err: any) {
      setError('Failed to update profile');
    }
    setSaving(false);
  };

  const isIncomplete =
    !profile.full_name || !profile.phone_number || !profile.profile_picture_url;

  if (loading) return <div>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Update Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="full_name"
          type="text"
          placeholder="Full Name"
          value={profile.full_name}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="phone_number"
          type="tel"
          placeholder="Phone Number"
          value={profile.phone_number}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <div style={{ marginBottom: 10 }}>
          <label>Profile Picture:</label>
          <input
            name="profile_picture_url"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'block', marginTop: 5 }}
          />
          {profile.profile_picture_url && (
            <div style={{ marginTop: 5 }}>
              <img
                src={profile.profile_picture_url}
                alt="Profile"
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
        <button type="submit" disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
      {isIncomplete && (
        <div style={{ color: 'orange', marginTop: 10 }}>
          Please complete all fields to finish your profile.
        </div>
      )}
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 10 }}>{success}</div>}
    </div>
  );
};

export default UserProfile;