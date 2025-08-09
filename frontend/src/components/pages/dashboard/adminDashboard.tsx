import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../Auth/firebaseClient';

function generateProductId() {
  return 'PROD-' + Math.floor(1000000000 + Math.random() * 9000000000);
}

function generateDriverId() {
  return 'DRIVER-' + Math.floor(1000000000 + Math.random() * 9000000000);
}

const vehicleTypes = ['van', 'sedan', 'hatch'];
const productCategories = [
  'Hair Extensions',
  'Wigs',
  'Conditioners',
  'Shampoos',
  'Hair Tools',
  'Hair Care',
  'Hair Coloring',
  'Hair Food',
  'Hair Loss Treatments',
  'Hair Styling Products',
  'Moisturizers',
  'Relaxers',
  'Hair Accessories',
  'Hair Growth Products',
]; 

interface AdminProfile {
  full_name?: string;
  email: string;
  user_type: string;
}

const AdminDashboard = () => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverForm, setDriverForm] = useState({
    driver_id: generateDriverId(),
    email: '', password: '', full_name: '', phone_number: '',
    vehicle_type: '', vehicle_model: '', bank_details: '',
    license_number: '', license_image: null as File | null
  });
  const [driverError, setDriverError] = useState('');
  const [driverSuccess, setDriverSuccess] = useState('');
  const [productForm, setProductForm] = useState({
    product_id: generateProductId(), name: '', description: '', price: '',
    brand: '', category: '', image: null as File | null
  });
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');
  const [promoteUid, setPromoteUid] = useState('');
  const [promoteMsg, setPromoteMsg] = useState('');
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

  // Driver form handlers
  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDriverForm({ ...driverForm, [name]: value });
  };
  const handleDriverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriverForm({ ...driverForm, license_image: e.target.files?.[0] || null });
  };

  // Product form handlers
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm({ ...productForm, [name]: value });
  };
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductForm({ ...productForm, image: e.target.files?.[0] || null });
  };

  // Register new driver
  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError('');
    setDriverSuccess('');
    try {
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, driverForm.email, driverForm.password);
      const driverUid = userCredential.user.uid; // Use Firebase UID for storage
      const token = await auth.currentUser?.getIdToken();

      // Upload license image to Firebase Storage
      let licenseImageUrl = '';
      if (driverForm.license_image) {
        const storage = getStorage(app);
        const imageRef = ref(storage, `driver-licenses/${driverUid}/${Date.now()}_${driverForm.license_image.name}`);
        await uploadBytes(imageRef, driverForm.license_image);
        licenseImageUrl = await getDownloadURL(imageRef);
      }

      // Add driver profile to backend
      await axios.post('/api/drivers/register', {
        driver_id: driverForm.driver_id, 
        firebase_uid: driverUid,        
        full_name: driverForm.full_name,
        phone_number: driverForm.phone_number,
        user_type: 'driver',
        vehicle_type: driverForm.vehicle_type,
        vehicle_model: driverForm.vehicle_model,
        bank_details: driverForm.bank_details,
        license_number: driverForm.license_number,
        license_image_url: licenseImageUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDriverSuccess('Driver registered successfully!');
      setDriverForm({
        driver_id: generateDriverId(),
        email: '', password: '', full_name: '', phone_number: '',
        vehicle_type: '', vehicle_model: '', bank_details: '',
        license_number: '', license_image: null
      });
    } catch (err: any) {
      setDriverError(err.message || 'Driver registration failed');
    }
  };

  // Add new product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductError('');
    setProductSuccess('');
    try {
      const auth = getAuth(app);
      const token = await auth.currentUser?.getIdToken();

      // Upload product image to Firebase Storage
      let productImageUrl = '';
      if (productForm.image) {
        const storage = getStorage(app);
        const imageRef = ref(storage, `products/${productForm.product_id || productForm.name}_${Date.now()}`);
        await uploadBytes(imageRef, productForm.image);
        productImageUrl = await getDownloadURL(imageRef);
      }

      await axios.post('/api/products', {
        product_id: productForm.product_id,
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        brand: productForm.brand,
        category: productForm.category,
        image_url: productImageUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProductSuccess('Product added successfully!');
      setProductForm({
        product_id: generateProductId(), name: '', description: '', price: '',
        brand: '', category: '', image: null
      });
    } catch (err: any) {
      setProductError(err.message || 'Product creation failed');
    }
  };

  // Promote user to admin
  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteMsg('');
    try {
      await axios.post('/api/auth/promote-admin', { uid: promoteUid });
      setPromoteMsg('User promoted to admin!');
      setPromoteUid('');
    } catch (err: any) {
      setPromoteMsg(err.response?.data?.error || 'Promotion failed');
    }
  };

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>
        Welcome, {admin?.full_name ? admin.full_name : admin?.email} (Admin)
      </h1>
      <p>You have access to the admin dashboard.</p>

      <hr />
      <h2>Register New Driver</h2>
      <form onSubmit={handleRegisterDriver} style={{ maxWidth: 400, margin: '0 auto' }}>
        <input
          name="email"
          type="email"
          placeholder="Driver Email"
          value={driverForm.email}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={driverForm.password}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="full_name"
          type="text"
          placeholder="Full Name"
          value={driverForm.full_name}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="phone_number"
          type="tel"
          placeholder="Phone Number"
          value={driverForm.phone_number}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <select
          name="vehicle_type"
          value={driverForm.vehicle_type}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        >
          <option value="">Select Vehicle Type</option>
          {vehicleTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <input
          name="vehicle_model"
          type="text"
          placeholder="Vehicle Model"
          value={driverForm.vehicle_model}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="bank_details"
          type="text"
          placeholder="Bank Details"
          value={driverForm.bank_details}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="license_number"
          type="text"
          placeholder="License Number"
          value={driverForm.license_number}
          onChange={handleDriverChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="license_image"
          type="file"
          accept="image/*"
          onChange={handleDriverImageChange}
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <button type="submit" style={{ width: '100%' }}>
          Register Driver
        </button>
      </form>
      {driverError && <div style={{ color: 'red', marginTop: 10 }}>{driverError}</div>}
      {driverSuccess && <div style={{ color: 'green', marginTop: 10 }}>{driverSuccess}</div>}

      <hr />
      <h2>Add New Product</h2>
      <form onSubmit={handleAddProduct} style={{ maxWidth: 400, margin: '0 auto' }}>
        <input
          name="product_id"
          type="text"
          placeholder="Product ID"
          value={productForm.product_id}
          readOnly
          style={{ display: 'block', marginBottom: 10, width: '100%', background: '#eee' }}
        />
        <input
          name="name"
          type="text"
          placeholder="Product Name"
          value={productForm.name}
          onChange={handleProductChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="brand"
          type="text"
          placeholder="Brand"
          value={productForm.brand}
          onChange={handleProductChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <select
          name="category"
          value={productForm.category}
          onChange={handleProductChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        >
          <option value="">Select Category</option>
          {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <input
          name="description"
          type="text"
          placeholder="Description"
          value={productForm.description}
          onChange={handleProductChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="price"
          type="number"
          placeholder="Price"
          value={productForm.price}
          onChange={handleProductChange}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <input
          name="image"
          type="file"
          accept="image/*"
          onChange={handleProductImageChange}
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <button type="submit" style={{ width: '100%' }}>
          Add Product
        </button>
      </form>
      {productError && <div style={{ color: 'red', marginTop: 10 }}>{productError}</div>}
      {productSuccess && <div style={{ color: 'green', marginTop: 10 }}>{productSuccess}</div>}

      <hr />
      <h2>Promote User to Admin</h2>
      <form onSubmit={handlePromoteAdmin} style={{ maxWidth: 400, margin: '0 auto' }}>
        <input
          type="text"
          placeholder="Firebase UID"
          value={promoteUid}
          onChange={e => setPromoteUid(e.target.value)}
          required
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />
        <button type="submit" style={{ width: '100%' }}>
          Promote to Admin
        </button>
      </form>
      {promoteMsg && <div style={{ marginTop: 10 }}>{promoteMsg}</div>}
    </div>
  );
};

export default AdminDashboard;