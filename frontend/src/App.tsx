import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LayOut from './components/pages/LayOut';
import UserAccount from './components/pages/userpages/userAccount';
import UserProfile from './components/pages/userpages/userProfile';
import UserOrders from './components/pages/userpages/userOrders';
import LoginPage from './components/pages/storepages/loginPage';
import DriversDash from './components/pages/drivers/driversDash';
import AdminLogin from './components/pages/dashboard/adminLogin'
import AdminDashboard from './components/pages/dashboard/adminDashboard';
import UserRegistration from './components/pages/userpages/userReg'; 
import HomePage from './components/pages/storepages/homepage';
import ProductDetailPage from './components/pages/storepages/productview/productsDetail';
import CartPage from './components/pages/storepages/cart/cartPage';
import SupportPage from './components/pages/storepages/helpcentre/SupportPage';
import ScrollToTop from './components/ScrollToTop';
import { FavoritesProvider } from './components/contexts/FavoritesContext';
import { CartProvider } from './components/contexts/CartContext';
import CheckoutPage from './components/pages/storepages/cart/CheckoutPage';

function App() {
  return (
    <Router>
      <FavoritesProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/register" element={<UserRegistration />} /> 
            <Route path="/login" element={<LoginPage />} />
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/admindashboard" element={<AdminDashboard />} />
            <Route path="/driversdashboard" element={<DriversDash />} />
            <Route path="/" element={<LayOut />}>
              <Route index element={<HomePage />} /> 
              <Route path="/useraccount" element={<UserAccount />} />
              <Route path="/userprofile" element={<UserProfile />} />
              <Route path="/userorders" element={<UserOrders />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:id" element={<div>Order confirmed</div>} />
              <Route path="/support" element={<SupportPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </FavoritesProvider>
    </Router>
  );
}

export default App;
