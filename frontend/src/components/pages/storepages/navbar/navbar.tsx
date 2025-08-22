import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../../assets/logos/LZAWHTTRP.webp';
import './navstyle.css';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-logo">
          <img src={Logo} alt="Logo" className='navbar-logo'/>
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
          <Link to="/cart" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/lift-cart-here.png" alt="lift-cart-here"/>
            Cart
          </Link>
          <button className="navbar-logout" onClick={() => {/* handle logout */ setDropdownOpen(false);}}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png" alt="logout-rounded-left"/>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;