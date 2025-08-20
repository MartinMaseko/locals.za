import { Link, useNavigate, useLocation } from 'react-router-dom';
import './appnavstyle.css';

const AppNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCategoriesClick = () => {
    if (location.pathname === '/' || location.pathname === '') {
      window.dispatchEvent(new Event('toggleCategories'));
    } else {
      navigate('/', { replace: false });
      setTimeout(() => window.dispatchEvent(new Event('toggleCategories')), 80);
    }
  };

  return (
    <nav className="appnav-bar">
      <Link to="/" className="appnav-icon" title="Home">
        <img className='appnav-icons' src="https://img.icons8.com/material-rounded/40/ffb803/home.png" alt="home"/>
        Home
      </Link>
      <button type="button" className="appnav-icon" title="Categories" onClick={handleCategoriesClick}>
        <img className='appnav-icons' src="https://img.icons8.com/ios/40/ffb803/sorting-answers.png" alt="categories"/>
        <span>Category</span>
      </button>

      <Link to="/support" className="appnav-icon" title="Support">
        <img className='appnav-icons' src="https://img.icons8.com/material-sharp/40/ffb803/ask-question.png" alt="support"/>
        <span>Support</span>
      </Link>
      <Link to="/cart" className="appnav-icon" title="Cart">
        <img className='appnav-icons' src="https://img.icons8.com/ios-glyphs/40/ffb803/lift-cart-here.png" alt="cart"/>
        <span>Cart</span>
      </Link>
    </nav>
  );
};

export default AppNav;