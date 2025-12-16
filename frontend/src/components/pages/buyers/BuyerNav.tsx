import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logos/LZA ICON.png';
import '../storepages/navbar/navstyle.css';
import '../drivers/driverStyles.css';
import './buyerStyles.css';

const BuyerNav = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('Buyer Signed Out');
      setDropdownOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="driver-nav-container">
      <nav className="navbar drivers-navbar">
        <div className="driver-navbar-content">
          <div className="driver-navbar-logo">
            <Link to="/buyer/dashboard">
              <img src={Logo} alt="LocalsZA" className="driver-logo" />
            </Link>
          </div>

          <div className="navbar-menu">
            <button 
              className="navbar-menu-button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>

        <div className={`navbar-fullscreen-dropdown ${dropdownOpen ? 'open' : ''}`}>
          <div className="navbar-fullscreen-items">
            <Link to="/buyer/orders" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
              <img width="35" height="35" src="https://img.icons8.com/external-kmg-design-glyph-kmg-design/35/ffb803/external-logistics-shipping-delivery-kmg-design-glyph-kmg-design-2.png" alt="orders"/>
              Orders
            </Link>
            <Link to="/buyer/price-updates" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
              <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/price-tag.png" alt="price-updates"/>
              Price Updates
            </Link>
            <button className="navbar-logout" onClick={handleSignOut}>
              <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png" alt="logout-rounded-left"/>
              Sign Out
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default BuyerNav;