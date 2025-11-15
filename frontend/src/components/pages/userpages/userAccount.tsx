import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import LoadingContext from '../storepages/LoadingContext';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { app } from '../../../Auth/firebaseClient';
import './userstyle.css';
import LogoAnime from '../../../components/assets/logos/locals-svg.gif';
import { Link } from 'react-router-dom';
import LocalsZAIcon from '../../assets/logos/LZA ICON.png';

const API_URL = import.meta.env.VITE_API_URL;

interface UserProfile {
  full_name: string;
  phone_number: string;
  profile_picture_url: string;
  email: string;
}

const UserAccount = () => {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone_number: '',
    profile_picture_url: '',
    email: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Use global loading context
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Sync local loading state with global loading context
  useEffect(() => {
    setGlobalLoading(loading);
    return () => setGlobalLoading(false); // Cleanup on unmount
  }, [loading, setGlobalLoading]);

  // First, ensure auth is initialized and we have a user
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);

      if (user) {
        fetchProfile(user); // Pass the user directly to fetchProfile
      } else {
        setLoading(false); // Make sure to set loading to false when no user
      }
    });

    return () => unsubscribe();
  }, []);

  // Separate fetchProfile function to be reusable
  const fetchProfile = async (user: any) => {
    if (!user) return;

    setLoading(true); // Set loading to true when fetching profile
    setError('');

    try {
      // Force a fresh token
      const token = await user.getIdToken(true);

      const { data } = await axios.get<UserProfile>(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle profile picture URL
      let profilePic = data.profile_picture_url || '';

      // If backend returned a non-http path, try to resolve it
      if (profilePic && !/^https?:\/\//i.test(profilePic)) {
        try {
          const storage = getStorage(app);
          const refPath = profilePic.replace(/^\/+/, '');
          profilePic = await getDownloadURL(ref(storage, refPath));
        } catch (urlErr) {
          // Silent failure for image resolution
        }
      }

      // FALLBACK: if backend didn't provide a picture, try listing user's profile-images folder
      if ((!profilePic || profilePic === '') && user) {
        try {
          const storage = getStorage(app);
          const userFolderRef = ref(storage, `profile-images/${user.uid}`);
          const listResult = await listAll(userFolderRef);
          if (listResult.items && listResult.items.length > 0) {
            const lastItem = listResult.items[listResult.items.length - 1];
            profilePic = await getDownloadURL(lastItem);
          }
        } catch (listErr) {
          // Silent failure for image resolution
        }
      }

      setProfile({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        profile_picture_url: profilePic,
        email: data.email || user.email || '',
      });
    } catch (err: any) {
      setError('Failed to load profile: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
    } finally {
      setLoading(false); // Set loading to false when done
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Handle profile image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // create object URL for immediate preview
      const previewUrl = URL.createObjectURL(file);
      // revoke previous preview if any
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(previewUrl);
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    let imageUrl = profile.profile_picture_url;

    try {
      if (!authUser) {
        throw new Error('You must be signed in to update your profile.');
      }

      // If a new image is selected, upload it to Firebase Storage
      if (imageFile) {
        const uid = authUser.uid;
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${uid}_${Date.now()}.${fileExt}`;
        const storage = getStorage(app);
        const imageRef = ref(storage, `profile-images/${uid}/${fileName}`);

        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Get a fresh token
      const token = await authUser.getIdToken(true);

      // Update the profile directly
      await axios.put(
        `${API_URL}/api/users/me`,
        {
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          profile_picture_url: imageUrl,
          display_name: authUser.displayName || profile.full_name,
          email: authUser.email || profile.email,
          auth_provider: authUser.providerData?.[0]?.providerId || 'unknown',
          uid: authUser.uid, 
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update the local state immediately
      setProfile({
        ...profile,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        profile_picture_url: imageUrl,
      });

      // Force re-fetch profile from server to confirm changes
      await fetchProfile(authUser);

      setSuccess('Profile updated successfully!');
      setImageFile(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    } catch (err: any) {
      setError('Failed to update profile: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
    }
    setSaving(false);
  };

  const isIncomplete = !profile.full_name || !profile.phone_number || !profile.profile_picture_url;

  // Use the same loading UI as homepage
  if (loading) {
    return (
      <div className='loading-container'>
        <img src={LogoAnime} alt="Loading..." className="loading-gif" />
        Loading...
      </div>
    );
  }

  // Show login prompt if no user
  if (!authUser) {
    return (
      <div className="user-orders-error">
          <img src={LocalsZAIcon} alt="Locals ZA Logo" className="login-error-icon" />
          <p className='login-error-message'>Log in to view your profile.</p>
          <Link className='login-error-link' to="/login">Login</Link>
        </div>
    );
  }

  // choose heading image: preview -> uploaded url -> default icon
  const headingImageSrc =
    imagePreview || profile.profile_picture_url || 'https://img.icons8.com/pulsar-line/80/ffb803/user.png';

  return (
    <div className="profile-container">
      <div className="profile-heading">
        <img className="profile-picture" src={headingImageSrc} alt="user" />
        <h2>Your Account</h2>
      </div>
      <form className="profile-form" onSubmit={handleSubmit}>
        <input
          name="full_name"
          type="text"
          placeholder="Full Name"
          value={profile.full_name}
          onChange={handleChange}
          required
        />
        <input
          name="phone_number"
          type="tel"
          placeholder="Phone Number"
          value={profile.phone_number}
          onChange={handleChange}
          required
        />
        <div>
          <label>Profile Picture:</label>
          <input name="profile_picture_url" type="file" accept="image/*" onChange={handleImageChange} />
        </div>
        <button className="profile-save-button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
      {isIncomplete && <div className="notification">Please complete all fields to finish your profile.</div>}
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {success && <div style={{ color: '#FFB803', marginTop: 10 }}>{success}</div>}
    </div>
  );
};

export default UserAccount;