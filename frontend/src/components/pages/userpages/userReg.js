import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { signUp, signInWithGoogle } from '../../../Auth/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../assets/UI/loginReg.css';
import Logo from '../../assets/logos/LZABLKTRP.webp';
import LogoAnime from '../../assets/logos/locals-svg.gif';
const API_URL = import.meta.env.VITE_API_URL;
const UserRegistration = () => {
    const [form, setForm] = useState({ email: '', password: '', full_name: '', phone_number: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const navigate = useNavigate();
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await signUp(form.email, form.password);
            const user = userCredential.user;
            const token = await user.getIdToken();
            await axios.post(`${API_URL}/api/users/register`, {
                full_name: form.full_name,
                phone_number: form.phone_number,
                user_type: 'customer',
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Set redirecting state to true and show the loading animation
            setIsRedirecting(true);
            setTimeout(() => {
                navigate('/'); // Redirect after 3 seconds
            }, 3000);
        }
        catch (err) {
            setError(err.message || 'Registration failed');
            setLoading(false);
        }
    };
    const handleGoogleSignUp = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithGoogle();
            const user = result.user;
            const token = await user.getIdToken();
            await axios.post(`${API_URL}/api/users/register`, {
                full_name: user.displayName || '',
                phone_number: '',
                user_type: 'customer',
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Set redirecting state to true and show the loading animation
            setIsRedirecting(true);
            setTimeout(() => {
                navigate('/'); // Redirect after 3 seconds
            }, 3000);
        }
        catch (err) {
            setError(err.message || 'Google sign up failed');
            setLoading(false);
        }
    };
    if (isRedirecting) {
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading..."] }));
    }
    return (_jsxs("div", { className: 'registerLogin-container', children: [_jsx("img", { src: Logo, className: 'reg-logo', alt: "Logo" }), _jsx("h2", { children: "Register" }), _jsxs("form", { className: 'app-form', onSubmit: handleSubmit, children: [_jsx("input", { name: "email", type: "email", placeholder: "Email", value: form.email, onChange: handleChange, required: true }), _jsx("input", { name: "password", type: "password", placeholder: "Password", value: form.password, onChange: handleChange, required: true }), _jsx("input", { name: "full_name", type: "text", placeholder: "Full Name", value: form.full_name, onChange: handleChange, required: true }), _jsx("input", { name: "phone_number", type: "tel", placeholder: "Phone Number", value: form.phone_number, onChange: handleChange, required: true }), _jsx("button", { className: 'app-btn', type: "submit", disabled: loading, children: loading ? 'Registering...' : 'Register' })] }), _jsxs("button", { className: 'google-btn', type: "button", onClick: handleGoogleSignUp, disabled: loading, children: [_jsx("img", { width: "35", height: "35", src: "https://img.icons8.com/fluency/48/google-logo.png", alt: "google-logo" }), "oogle Sign Up"] }), error && _jsx("div", { style: { color: 'red', marginTop: 10 }, children: error }), _jsxs("div", { className: 'login-redirect-user', children: ["Already have an account? ", _jsx("a", { href: "/login", children: "Login here" })] })] }));
};
export default UserRegistration;
