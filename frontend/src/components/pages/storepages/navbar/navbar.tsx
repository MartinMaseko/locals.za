import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { useAuth } from '../../../../Auth/AuthProvider';
import { triggerPWAInstall, usePWAInstallAvailable } from '../../../pwa/PWAInstallBanner';
import './navstyle.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);
  const { currentUser } = useAuth();
  const canInstall = usePWAInstallAvailable();

  const close = () => { setMenuOpen(false); setAccountOpen(false); };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      close();
      navigate('/login');
    } catch {
      // sign out failed — swallow
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Left — hamburger */}
        <div className="navbar-icon-group">
          <button
            className="navbar-icon"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img src="https://img.icons8.com/forma-thin-filled/40/FFB803/menu.png" alt="" />
          </button>
        </div>

        {/* Right — quick-access icons: Track, Messages, Support */}
        <div className="navbar-menu">
          <div className="navbar-icon-group">
            <Link to="/support" className="navbar-icon-btn" aria-label="Support">
              <img src="https://img.icons8.com/material-sharp/40/ffb803/ask-question.png" alt="Support" />
            </Link>
          </div>
        </div>
      </div>

      {/* Full-screen / side-panel sliding menu */}
      <div
        className={`navbar-fullscreen-dropdown${menuOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button className="navbar-close" onClick={close} aria-label="Close menu">
          &times;
        </button>

        <div className="navbar-fullscreen-items">
          {/* 1. Home */}
          <Link to="/" className="navbar-dropdown-item" onClick={close}>
            <img className="navbar-dropdown-icon" src="https://img.icons8.com/ios-filled/40/ffb803/home.png" alt="" />
            Home
          </Link>

          {/* 2. Account (collapsible) */}
          <button
            className="navbar-dropdown-item navbar-dropdown-item--toggle"
            onClick={() => setAccountOpen(o => !o)}
            aria-expanded={accountOpen}
          >
            <img className="navbar-dropdown-icon" src="https://img.icons8.com/pulsar-line/40/ffb803/guest-male.png" alt="" />
            Account
            <span className={`navbar-chevron${accountOpen ? ' navbar-chevron--open' : ''}`}>›</span>
          </button>

          {accountOpen && (
            <div className="navbar-account-sub">
              <Link to="/useraccount" className="navbar-dropdown-sub-item" onClick={close}>
                Profile
              </Link>
              <Link to="/userorders" className="navbar-dropdown-sub-item" onClick={close}>
                My Orders
              </Link>
              {currentUser ? (
                <button
                  className="navbar-dropdown-sub-item navbar-dropdown-sub-item--danger"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              ) : (
                <Link to="/login" className="navbar-dropdown-sub-item" onClick={close}>
                  Sign In
                </Link>
              )}
            </div>
          )}

          {/* 4. Calculator */}
          <Link to="/calculator" className="navbar-dropdown-item" onClick={close}>
            <img className="navbar-dropdown-icon" src="https://img.icons8.com/ios-filled/40/ffb803/calculator.png" alt="" />
            Calculator
          </Link>

          {/* 5. Support */}
          <Link to="/support" className="navbar-dropdown-item" onClick={close}>
            <img className="navbar-dropdown-icon" src="https://img.icons8.com/material-sharp/40/ffb803/ask-question.png" alt="" />
            Support
          </Link>
          {/* 6. Install App — only shown when installable / on iOS */}
          {canInstall && (
            <button
              className="navbar-dropdown-item"
              onClick={() => { triggerPWAInstall(); close(); }}
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;