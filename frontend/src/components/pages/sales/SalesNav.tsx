import { NavLink, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import { useState } from 'react';
import Logo from '../../assets/logos/LZA ICON.png';
import '../storepages/navbar/navstyle.css';
import '../drivers/driverStyles.css';

const SalesNav = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('salesRepId');
      localStorage.removeItem('salesRepUsername');
      console.log('Sales Rep Signed Out');
      setDropdownOpen(false);
      navigate('/sales/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="driver-nav-container">
      <nav className="navbar drivers-navbar">
        <div className="driver-navbar-content">
          <div className="driver-navbar-logo">
            <NavLink to="/sales/revenue">
              <img src={Logo} alt="LocalsZA" className="driver-logo" />
            </NavLink>
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
            <NavLink
              to="/sales/add-customer"
              className="navbar-dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <img
                width="35"
                height="35"
                src="https://img.icons8.com/ios-filled/35/ffb803/add-user-male.png"
                alt="add-customer"
              />
              Add Customer
            </NavLink>
            <NavLink
              to="/sales/customers"
              className="navbar-dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <img
                width="35"
                height="35"
                src="https://img.icons8.com/ios-filled/35/ffb803/user-group-man-man.png"
                alt="customers"
              />
              View Customers
            </NavLink>
            <NavLink
              to="/sales/shop"
              className="navbar-dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <img
                className="navbar-dropdown-icon"
                src="https://img.icons8.com/ios-glyphs/35/ffb803/shop.png"
                alt="shop"
              />
              Shop
            </NavLink>
            <NavLink
              to="/sales/revenue"
              className="navbar-dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <img
                className="navbar-dropdown-icon"
                src="https://img.icons8.com/ios-glyphs/35/ffb803/money-bag.png"
                alt="revenue"
              />
              Revenue
            </NavLink>
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

export default SalesNav;
