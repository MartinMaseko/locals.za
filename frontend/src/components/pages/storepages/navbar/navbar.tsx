import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../../assets/logos/LZAWHTTRP.webp';
import './navstyle.css';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('Signed Out');
      setDropdownOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Force a full page reload to check for PWA updates
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-logo">
          <a href="/" onClick={handleLogoClick} className="appnav-icon" title="Refresh App">
            <img src={Logo} alt="Logo" className='navbar-logo'/>
          </a>
        </div>
        <div className="navbar-menu">
          <Link to="/userorders" className="navbar-icon-orders" aria-label="Orders">
            <img 
              src="https://img.icons8.com/external-kmg-design-glyph-kmg-design/30/ffb803/external-logistics-shipping-delivery-kmg-design-glyph-kmg-design-2.png"
              alt="Orders"
            /> Orders
          </Link>
          <Link to="/cart" className="navbar-icon-cart" aria-label="Cart">
            <img 
              src="https://img.icons8.com/ios-glyphs/30/ffb803/lift-cart-here.png"
              alt="Cart"
            /> Cart
          </Link>
          <Link to="/support" className="navbar-icon-support" aria-label="Support">
            <img 
              src="https://img.icons8.com/material-sharp/30/ffb803/ask-question.png" alt="support"
            />
          </Link>
          <button
            className="navbar-icon"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Menu"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img 
              src="https://img.icons8.com/forma-thin-filled/40/FFB803/menu.png"
              alt="User Menu"
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
        <div className="navbar-fullscreen-items">
          <Link to="/login" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios/35/ffb803/login-rounded-right--v1.png" alt="login-rounded-right--v1"/>
            Login
          </Link>
          <Link to="/useraccount" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/pulsar-line/35/ffb803/guest-male.png" alt="guest-male"/>
            Account
          </Link>
          <Link to="/userorders" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img width="35" height="35" src="https://img.icons8.com/external-kmg-design-glyph-kmg-design/35/ffb803/external-logistics-shipping-delivery-kmg-design-glyph-kmg-design-2.png" alt="orders-box"/>
            Orders
          </Link>
          <Link to="/messages" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img width="35" height="35" src="https://img.icons8.com/ios-filled/35/ffb803/message-group.png" alt="message-group"/>
            Messages
          </Link>
          <Link to="/cart" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/lift-cart-here.png" alt="lift-cart-here"/>
            Cart
          </Link>
          <Link to="/support" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/material-sharp/40/ffb803/ask-question.png" alt="support"/>
            Support
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

export default Navbar;