import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logos/LZA ICON.png';
import '../storepages/navbar/navstyle.css';
import './driverStyles.css';

const DriversNav = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('Driver Signed Out');
      setDropdownOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="navbar drivers-navbar">
      <div className="navbar-content">
        <div className="navbar-logo">
          <img src={Logo} alt="Logo" className='driver-logo'/>
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
            <img width="35" height="35" src="https://img.icons8.com/material/35/ffb803/dashboard-layout.png" alt="dashboard-layout"/>
            Dashboard
          </Link>
          <Link to="/driver/account" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/pulsar-line/35/ffb803/guest-male.png" alt="account"/>
            Account
          </Link>
          <Link to="/driver/orders" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img width="35" height="35" src="https://img.icons8.com/ios-glyphs/35/ffb803/delivery.png" alt="delivery"/>
            Orders
          </Link>
          <Link to="/driver/revenue" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/money-bag.png" alt="revenue"/>
            Revenue
          </Link>
          <button className="navbar-logout" onClick={handleSignOut}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png" alt="logout-rounded-left"/>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default DriversNav;