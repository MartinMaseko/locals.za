import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LayOut from './components/pages/LayOut';
import UserAccount from './components/pages/userpages/userAccount';
import UserProfile from './components/pages/userpages/userProfile';
import UserOrders from './components/pages/userpages/userOrders';
import LoginPage from './components/pages/storepages/loginPage';
import AdminLogin from './components/pages/dashboard/adminLogin'
import AdminDashboard from './components/pages/dashboard/adminDashboard';
import UserRegistration from './components/pages/userpages/userReg'; 
import HomePage from './components/pages/storepages/homepage';
import ProductDetailPage from './components/pages/storepages/productview/productsDetail';
import CartPage from './components/pages/storepages/cart/cartPage';
import MessagesPage from './components/pages/storepages/messages/messagesPage';
import StoreCategories from './components/pages/storepages/store/storeCategories';
import SupportPage from './components/pages/storepages/helpcentre/SupportPage';
import ScrollToTop from './components/ScrollToTop';
import { FavoritesProvider } from './components/contexts/FavoritesContext';
import { CartProvider } from './components/contexts/CartContext';
import CheckoutPage from './components/pages/storepages/cart/CheckoutPage';
import OrderConfirmationPage from './components/pages/storepages/cart/OrderConfirmationPage';
import DriverLayout from './components/pages/drivers/layout/DriverLayout';
import DriversDash from './components/pages/drivers/driversDash';
import DriverLogin from './components/pages/drivers/auth/DriverLogin';
import DriverDeliveries from './components/pages/drivers/driverDeliveries';
import DriverRevenue from './components/pages/drivers/driverRevenue';

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
            <Route path="/driver-login" element={<DriverLogin />} />

            {/* Driver routes with shared layout */}
            <Route path="/driver" element={<DriverLayout />}>
              <Route path="dashboard" element={<DriversDash />} />
              <Route path="deliveries/:orderId" element={<DriverDeliveries />} />
              <Route path="/driver/revenue" element={<DriverRevenue />} />
            </Route>
            
            {/* Redirect for existing driversdashboard URL */}
            <Route path="/driversdashboard" element={<Navigate to="/driver/dashboard" replace />} />
            
            <Route path="/" element={<LayOut />}>
              <Route index element={<HomePage />} /> 
              <Route path="/useraccount" element={<UserAccount />} />
              <Route path="/userprofile" element={<UserProfile />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/userorders" element={<UserOrders />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
              <Route path="/shop" element={<StoreCategories />} />
              <Route path="/support" element={<SupportPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </FavoritesProvider>
    </Router>
  );
}

export default App;
