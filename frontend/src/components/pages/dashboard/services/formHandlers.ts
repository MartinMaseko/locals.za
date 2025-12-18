import axios from 'axios';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../../Auth/firebaseClient';
import { driversService } from './driversService';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Driver registration handler
 */
export const handleDriverRegistration = async (
  driverForm: any,
  token: string,
  onSuccess: () => void,
  onError: (error: string) => void
) => {
  try {
    const auth = getAuth(app);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      driverForm.email,
      driverForm.password
    );
    const driverUid = userCredential.user.uid;

    let licenseImageUrl = '';
    if (driverForm.license_image) {
      const storage = getStorage(app);
      const imageRef = ref(
        storage,
        `driver-licenses/${driverUid}/${Date.now()}_${driverForm.license_image.name}`
      );
      await uploadBytes(imageRef, driverForm.license_image);
      licenseImageUrl = await getDownloadURL(imageRef);
    }

    await driversService.registerDriver(token, {
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
    });

    onSuccess();
  } catch (err: any) {
    const errorMsg = err?.response?.data?.error || err?.message || 'Driver registration failed';
    onError(errorMsg);
  }
};

/**
 * Product upload handler
 */
export const handleProductImageUpload = async (
  file: File,
  productId: string
): Promise<string> => {
  try {
    const storage = getStorage(app);
    const imageRef = ref(storage, `products/${productId}_${Date.now()}`);
    await uploadBytes(imageRef, file);
    return await getDownloadURL(imageRef);
  } catch (uploadErr: any) {
    console.error('Image upload failed:', uploadErr);
    throw new Error(`Image upload failed: ${uploadErr.message}`);
  }
};

/**
 * Edit product handler
 */
export const handleProductUpdate = async (
  editingProduct: any,
  editProductForm: any,
  token: string
) => {
  let imageUrl = editProductForm.image_url || '';

  // Upload image if new file selected
  if (editProductForm.imageFile) {
    imageUrl = await handleProductImageUpload(
      editProductForm.imageFile,
      editingProduct.id || editingProduct.product_id
    );
  }

  const docId = editingProduct.id || editingProduct.product_id;
  if (!docId) throw new Error('Missing product id');

  const parsedPrice = Number(editProductForm.price);
  if (isNaN(parsedPrice)) {
    throw new Error('Price must be a valid number');
  }

  const payload = {
    name: editProductForm.name.trim(),
    description: editProductForm.description.trim(),
    price: parsedPrice,
    brand: editProductForm.brand.trim(),
    category: editProductForm.category.trim(),
    image_url: imageUrl
  };

  await axios.put(`${API_URL}/api/products/${docId}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return payload;
};
