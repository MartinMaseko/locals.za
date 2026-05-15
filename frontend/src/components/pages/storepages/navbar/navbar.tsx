import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './navstyle.css';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      navigate('/login');
    } catch (error) {
      // Sign out failed
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Hamburger */}
        <div className="navbar-icon-group">
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
        <div className="navbar-menu">
          {/* Icon pill group */}
          <div className="navbar-icon-group">
            <Link to="/messages" className="navbar-icon-btn" aria-label="Messages">
              <img
                src="https://img.icons8.com/ios-filled/40/ffb803/message-group.png"
                alt="Messages"
              />
            </Link>
            <Link to="/support" className="navbar-icon-btn" aria-label="Support">
              <img
                src="https://img.icons8.com/material-sharp/40/ffb803/ask-question.png"
                alt="Support"
              />
            </Link>
          </div>
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
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/ios/40/ffb803/login-rounded-right--v1.png" alt="login-rounded-right--v1"/>
            Login
          </Link>
          <Link to="/useraccount" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
            <img className='navbar-dropdown-icon' src="https://img.icons8.com/pulsar-line/40/ffb803/guest-male.png" alt="guest-male"/>
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