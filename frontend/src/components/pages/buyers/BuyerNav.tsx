import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logos/LZA ICON.png';
import '../storepages/navbar/navstyle.css';
import '../drivers/driverStyles.css';

const BuyerNav = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('Buyer Signed Out');
      setDropdownOpen(false);
      navigate('/buyer-login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="driver-nav-container">
      <nav className="navbar drivers-navbar">
        <div className="driver-navbar-content">
          <div className="driver-navbar-logo">
            <Link to="/buyer/orders">
              <img src={Logo} alt="LocalsZA" className="driver-logo" />
            </Link>
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
                alt="User Menu"
                style={{ width: '40px', height: '40px' }}
              />
            </button>
          </div>
        </div>

        <div className={`navbar-fullscreen-dropdown ${dropdownOpen ? 'open' : ''}`}>
          <button
            className="navbar-close"
            onClick={() => setDropdownOpen(false)}
            aria-label="Close Menu"
          >
            &times;
          </button>
          <div className="navbar-fullscreen-items">
            <Link
              to="/buyer/orders"
              className="navbar-dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <img
                width="35"
                height="35"
                src="https://img.icons8.com/external-kmg-design-glyph-kmg-design/35/ffb803/external-logistics-shipping-delivery-kmg-design-glyph-kmg-design-2.png"
                alt="orders"
              />
              Orders
            </Link>
            <Link
              to="/buyer/price-updates"
              className="navbar-dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <img
                className="navbar-dropdown-icon"
                src="https://img.icons8.com/ios-glyphs/35/ffb803/price-tag.png"
                alt="price-updates"
              />
              Update Prices
            </Link>
            <button
              className="navbar-logout"
              onClick={handleSignOut}
            >
              <img
                className="navbar-dropdown-icon"
                src="https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png"
                alt="logout"
              />
              Sign Out
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default BuyerNav;