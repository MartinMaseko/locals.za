import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import LoadingContext from '../storepages/LoadingContext';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { app } from '../../../Auth/firebaseClient';
import './userstyle.css';

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

  // Removed unused loading state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Use global loading context
  const loadingContext = useContext(LoadingContext);

  // NEW: preview URL state
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Keep track of auth state so we can require uid for storage rules
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(app), (user) => {
      if (user) {
        setProfile((p) => ({ ...p, email: p.email || user.email || '' }));
      }
    });
    return () => unsub();
  }, []);

  // Fetch current user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      // set both local and global loading
      if (loadingContext && 'setGlobalLoading' in loadingContext) {
        (loadingContext as any).setGlobalLoading(true);
      }
      setError('');
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        let token = '';
        if (user) token = await user.getIdToken();

        const { data } = await axios.get<UserProfile>('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // backend value (may be undefined)
        let profilePic = (data as any).profile_picture_url || '';

        // If backend returned a non-http path, try to resolve it
        if (profilePic && !/^https?:\/\//i.test(profilePic)) {
          try {
            const storage = getStorage(app);
            const refPath = profilePic.replace(/^\/+/, '');
            profilePic = await getDownloadURL(ref(storage, refPath));
          } catch (urlErr) {
            console.warn('Could not resolve profile_picture_url to download URL:', urlErr);
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
            } else {
              console.log('no files found in profile-images folder for user:', user.uid);
            }
          } catch (listErr) {
            console.warn('Could not list/resolve profile images from storage:', listErr);
          }
        }

        setProfile({
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          profile_picture_url: profilePic,
          email: data.email || (user && user.email ? user.email : ''),
        });
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile');
      } finally {
        if (loadingContext && 'setGlobalLoading' in loadingContext) {
          (loadingContext as any).setGlobalLoading(false);
        }
        // setGlobalLoading(false); // Removed: not defined
      }
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
      const file = e.target.files[0];
      setImageFile(file);

      // create object URL for immediate preview
      const previewUrl = URL.createObjectURL(file);
      // revoke previous preview if any
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(previewUrl);
    }
  };

  // revoke object URL when component unmounts or preview changes
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
      const auth = getAuth(app);
      const user = auth.currentUser;

      // require authenticated user for upload (rules expect uid folder)
      if (!user && imageFile) {
        setError('You must be signed in to upload a profile image.');
        setSaving(false);
        return;
      }

      // If a new image is selected, upload it to Firebase Storage (into user uid folder)
      if (imageFile && user) {
        const uid = user.uid;
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${uid}_${Date.now()}.${fileExt}`;
        const storage = getStorage(app);
        const imageRef = ref(storage, `profile-images/${uid}/${fileName}`);
        try {
          await uploadBytes(imageRef, imageFile);
          imageUrl = await getDownloadURL(imageRef);
        } catch (upErr: any) {
          console.error('Firebase upload failed:', upErr);
          throw upErr;
        }
      }

      // Update user profile in your backend
      let token = '';
      if (user) token = await user.getIdToken();

      await axios.put(
        '/api/users/me',
        {
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          profile_picture_url: imageUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess('Profile updated successfully!');
      setProfile((prev) => ({ ...prev, profile_picture_url: imageUrl }));
      setImageFile(null);

      // clear preview after successful upload (and revoke)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile: ' + (err?.message || 'unknown error'));
    }
    setSaving(false);
  };

  const isIncomplete = !profile.full_name || !profile.phone_number || !profile.profile_picture_url;

  // NOTE: remove the early return `if (loading) return <div>Loading profile...</div>;`
  // so the Layout/global loading UI is used instead.

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