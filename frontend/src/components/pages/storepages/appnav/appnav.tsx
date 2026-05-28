import { Link } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import './appnavstyle.css';

const AppNav = () => {
  const { cart } = useCart();
  const itemCount = Array.isArray(cart) ? cart.reduce((acc, it) => acc + (it.qty || 0), 0) : 0;

  return (
    <nav className="appnav-bar">
      <Link to="/" className="appnav-icon" title="Home">
        <img className='appnav-icons' src="https://img.icons8.com/material-rounded/40/ffb803/home.png" alt="home"/>
        Home
      </Link>
      <Link to="/shop" className="appnav-icon" title="Shop">
        <img  className='appnav-icons' src="https://img.icons8.com/material-rounded/40/ffb803/shop.png" alt="shop"/>
        <span>Shop</span>
      </Link>

      <Link to="/support" className="appnav-icon" title="Support">
        <img className='appnav-icons' src="https://img.icons8.com/material-sharp/40/ffb803/ask-question.png" alt="support"/>
        <span>Support</span>
      </Link>
      <Link to="/cart" className="appnav-icon" title="Cart">
        <img className='appnav-icons' src="https://img.icons8.com/ios-glyphs/40/ffb803/lift-cart-here.png" alt="cart"/>
        <span>
          Cart 
          <span className="cart-item-count"> {itemCount}</span>
        </span>
      </Link>
    </nav>
  );
};

export default AppNav;