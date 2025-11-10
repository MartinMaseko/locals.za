import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { signIn } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/logos/LZABLKTRP.webp';
import '../../assets/UI/loginReg.css';
const API_URL = import.meta.env.VITE_API_URL;
const AdminLogin = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await signIn(form.email, form.password);
            const access_token = userCredential.access_token || userCredential.accessToken;
            if (!access_token)
                throw new Error('Login failed. No access token returned.');
            // Fetch user profile to check if admin
            const { data: profile } = await axios.get(`${API_URL}/api/api/users/me`, {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            if (profile.user_type === 'admin') {
                navigate('/admindashboard');
            }
            else {
                setError('Access denied. Not an admin user.');
            }
        }
        catch (err) {
            setError(err.message || 'Login failed');
        }
        setLoading(false);
    };
    return (_jsxs("div", { className: 'registerLogin-container', children: [_jsx("img", { src: Logo, className: 'reg-logo', alt: "Logo" }), _jsx("h2", { children: "Admin Login" }), _jsxs("form", { className: 'app-form', onSubmit: handleSubmit, children: [_jsx("input", { name: "email", type: "email", placeholder: "Email", value: form.email, onChange: handleChange, required: true }), _jsx("input", { name: "password", type: "password", placeholder: "Password", value: form.password, onChange: handleChange, required: true }), _jsx("button", { className: 'app-btn', type: "submit", disabled: loading, children: loading ? 'Logging in...' : 'Login' })] }), error && _jsx("div", { style: { color: 'red', marginTop: 10 }, children: error })] }));
};
export default AdminLogin;
