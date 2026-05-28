import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './driverStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

const DriversNav = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<string>('offline');
  const navigate = useNavigate();
  const auth = getAuth(app);

  // Fetch driver status once on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await axios.get<{ status: string }>(`${API_URL}/api/drivers/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOnlineStatus(res.data.status);
      } catch {
        // silently ignore — status indicator is cosmetic
      }
    };
    fetchStatus();
  }, [auth]);

  const isOnline = onlineStatus === 'available' || onlineStatus === 'on_delivery';

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      navigate('/driverlogin');
    } catch {
      // sign-out failed
    }
  };

  return (
    <nav className="drivers-navbar">
      <div className="driver-navbar-content">
        <div className="driver-navbar-logo">
          <Link to="/driversdashboard">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/logos%2FdriverLogo.png?alt=media&token=f9413fdd-7ea8-43d9-a013-8161dd5bd34f"
              alt="Logo"
              className="driver-logo"
            />
          </Link>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 9, height: 9, borderRadius: '50%',
              background: isOnline ? '#4CAF50' : '#888',
              display: 'inline-block',
              boxShadow: isOnline ? '0 0 0 2px rgba(76,175,80,0.3)' : 'none',
            }}
          />
          <span style={{ color: isOnline ? '#4CAF50' : '#aaa', fontSize: '0.72rem', fontWeight: 600 }}>
            {onlineStatus === 'on_delivery' ? 'On Delivery' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="navbar-menu">
          <button
            className="navbar-icon"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Menu"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img
              src="https://img.icons8.com/forma-thin-filled/40/FFB803/menu.png"
              alt="Driver Menu"
              style={{ width: '40px', height: '40px' }}
            />
          </button>
        </div>
      </div>

      {/* Full-screen sliding menu */}
      <div className={`navbar-fullscreen-dropdown${dropdownOpen ? ' open' : ''}`}>
        <button
          className="navbar-close"
          onClick={() => setDropdownOpen(false)}
          aria-label="Close Menu"
        >
          &times;
        </button>
        <div className="navbar-fullscreen-items driver-menu-items">
          <Link to="/driversdashboard" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img width="35" height="35"
              src="https://img.icons8.com/material/35/ffb803/dashboard-layout.png" alt="" />
            Dashboard
          </Link>
          <Link to="/driver/revenue" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className="navbar-dropdown-icon"
              src="https://img.icons8.com/ios-glyphs/35/ffb803/money-bag.png" alt="" />
            Earnings
          </Link>
          <button className="navbar-logout" onClick={handleSignOut}>
            <img className="navbar-dropdown-icon"
              src="https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png" alt="" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default DriversNav;
