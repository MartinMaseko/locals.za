import { useState } from 'react';
import { handleDriverRegistration } from '../services/formHandlers';
import { generateDriverId, vehicleTypes } from '../utils/helpers';

interface RegisterDriverSectionProps {
  getToken: () => Promise<string>;
  driversState: any;
}

const RegisterDriverSection = ({ getToken, driversState }: RegisterDriverSectionProps) => {
  const [driverForm, setDriverForm] = useState({
    driver_id: generateDriverId(), 
    email: '', 
    password: '', 
    full_name: '', 
    phone_number: '',
    vehicle_type: '', 
    vehicle_model: '', 
    bank_details: '', 
    license_number: '', 
    license_image: null as File | null
  });

  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDriverForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDriverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriverForm(prev => ({ ...prev, license_image: e.target.files?.[0] || null }));
  };

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      await handleDriverRegistration(
        driverForm,
        token,
        () => {
          driversState.setSuccess('Driver registered successfully!');
          setDriverForm({ 
            driver_id: generateDriverId(), 
            email: '', 
            password: '', 
            full_name: '', 
            phone_number: '', 
            vehicle_type: '', 
            vehicle_model: '', 
            bank_details: '', 
            license_number: '', 
            license_image: null 
          });
        },
        (error: string) => driversState.setError(error)
      );
    } catch (err: any) {
      driversState.setError(err?.message || 'Driver registration failed');
    }
  };

  return (
    <div className="driver-form-section">
      <h2>Register New Driver</h2>
      <form onSubmit={handleRegisterDriver} className="admin-form">
        <div className="form-group"><input name="email" type="email" placeholder="Driver Email" value={driverForm.email} onChange={handleDriverChange} required /></div>
        <div className="form-group"><input name="password" type="password" placeholder="Password" value={driverForm.password} onChange={handleDriverChange} required /></div>
        <div className="form-group"><input name="full_name" type="text" placeholder="Full Name" value={driverForm.full_name} onChange={handleDriverChange} required /></div>
        <div className="form-group"><input name="phone_number" type="tel" placeholder="Phone Number" value={driverForm.phone_number} onChange={handleDriverChange} required /></div>
        <div className="form-group"><select name="vehicle_type" value={driverForm.vehicle_type} onChange={handleDriverChange} required className='form-select'><option value="">Select Vehicle Type</option>{vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="form-group"><input name="vehicle_model" type="text" placeholder="Vehicle Model" value={driverForm.vehicle_model} onChange={handleDriverChange} required /></div>
        <div className="form-group"><input name="bank_details" type="text" placeholder="Bank Details" value={driverForm.bank_details} onChange={handleDriverChange} required /></div>
        <div className="form-group"><input name="license_number" type="text" placeholder="License Number" value={driverForm.license_number} onChange={handleDriverChange} required /></div>
        <div className="form-group file-input-group"><label>License Image:</label><input name="license_image" type="file" accept="image/*" onChange={handleDriverImageChange} /></div>
        <button type="submit" className="form-button">Register Driver</button>
        {driversState.error && <div className="error-message">{driversState.error}</div>}
        {driversState.success && <div className="success-message">{driversState.success}</div>}
      </form>
    </div>
  );
};

export default RegisterDriverSection;
