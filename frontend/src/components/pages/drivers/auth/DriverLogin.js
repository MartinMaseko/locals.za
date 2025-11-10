import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import axios from 'axios';
import Logo from '../../../assets/logos/LZABLKTRP.webp';
import '../../../assets/UI/loginReg.css';
const API_URL = import.meta.env.VITE_API_URL;
const DriverLogin = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        driver_id: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth(app);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Step 1: Verify driver credentials
            const verifyResponse = await axios.post(`${API_URL}/api/api/drivers/verify-credentials`, {
                full_name: formData.full_name,
                driver_id: formData.driver_id
            });
            // Check if we have the firebase_uid - that's all we need for custom token auth
            if (!verifyResponse.data || !verifyResponse.data.firebase_uid) {
                throw new Error('Failed to verify driver credentials');
            }
            // Step 2: Get temporary login credentials
            const { firebase_uid } = verifyResponse.data;
            const loginResponse = await axios.post(`${API_URL}/api/api/drivers/login-link`, {
                driver_id: formData.driver_id,
                firebase_uid: firebase_uid
            });
            // Check if we have the login response
            if (!loginResponse.data) {
                throw new Error('Failed to generate login credentials');
            }
            // Try to authenticate with custom token (preferred method)
            if (loginResponse.data.customToken) {
                try {
                    await signInWithCustomToken(auth, loginResponse.data.customToken);
                    navigate('/driversdashboard');
                    return;
                }
                catch (customTokenError) {
                    // Fall back to email/password if available
                }
            }
            // Fall back to email/password if we have both email and temporaryPassword
            if (loginResponse.data.temporaryPassword && verifyResponse.data.email) {
                const temporaryPassword = loginResponse.data.temporaryPassword;
                const email = verifyResponse.data.email;
                try {
                    // Ensure email is a string and not undefined or null
                    if (typeof email !== 'string' || !email.includes('@')) {
                        throw new Error('Invalid email format');
                    }
                    await signInWithEmailAndPassword(auth, email, temporaryPassword);
                    navigate('/driversdashboard');
                }
                catch (emailPassError) {
                    throw emailPassError;
                }
            }
            else {
                if (!loginResponse.data.customToken) {
                    throw new Error('No authentication method available');
                }
            }
        }
        catch (err) {
            // Handle different error types
            if (err.response) {
                // Server responded with an error status
                if (err.response.status === 401) {
                    setError('Invalid driver credentials. Please check your name and driver ID.');
                }
                else if (err.response.status === 403) {
                    setError('Access denied. Your account may be disabled.');
                }
                else {
                    setError(err.response.data?.error || 'Login failed. Please try again.');
                }
            }
            else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError('Authentication failed. Please contact support.');
            }
            else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
                setError('Driver account not properly set up. Please contact support.');
            }
            else if (err.code === 'auth/missing-email') {
                setError('Missing email information. Please contact support.');
            }
            else if (err.request) {
                // Request was made but no response
                setError('No response from server. Please check your connection and try again.');
            }
            else {
                // Error setting up request
                setError('Login failed. Please try again or contact support.');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "registerLogin-container driver-login-container", children: [_jsx("img", { src: Logo, alt: "Locals ZA", className: "reg-logo" }), _jsx("h1", { children: "Driver Login" }), _jsx("p", { className: "driver-login-subtitle", children: "Access your delivery dashboard" }), error && _jsx("div", { className: "error-message", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "app-form driver-login-form", children: [_jsx("div", { className: "form-group", children: _jsx("input", { type: "text", name: "full_name", value: formData.full_name, onChange: handleChange, placeholder: "Full Name", required: true, id: "driver-login-input" }) }), _jsx("div", { className: "form-group", children: _jsx("input", { type: "text", name: "driver_id", value: formData.driver_id, onChange: handleChange, placeholder: "Driver ID", required: true, id: "driver-login-input" }) }), _jsx("button", { type: "submit", className: "app-btn", disabled: loading, children: loading ? 'Signing in...' : 'Sign In' })] }), _jsxs("div", { className: "driver-help", children: [_jsxs("p", { children: ["Need help? Email support at ", _jsx("strong", { className: 'help-cta', children: "admin@locals-za.co.za" })] }), _jsx("p", { children: "WhatsApp Support" }), _jsx("a", { href: "https://wa.me/27629973007" // Replace with business No.
                        , target: "_blank", rel: "noopener noreferrer", className: "whatsapp-link", "aria-label": "Contact us on WhatsApp", children: _jsx("div", { className: "whatsapp-icon pulsate", children: _jsx("img", { width: "48", height: "48", src: "https://img.icons8.com/color/48/whatsapp--v1.png", alt: "WhatsApp Support" }) }) })] })] }));
};
export default DriverLogin;
