import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './Auth/AuthProvider';
import { ProtectedRoute } from './Auth/ProtectedRoute';  
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
import SupportPage from './components/pages/storepages/support/supportPage';
import ScrollToTop from './components/ScrollToTop';
import { FavoritesProvider } from './components/contexts/FavoritesContext';
import { CartProvider } from './components/contexts/CartContext';
import { WazeRouteProvider } from './components/contexts/WazeRouteContext';
import CheckoutPage from './components/pages/storepages/cart/CheckoutPage';
import OrderConfirmationPage from './components/pages/storepages/cart/OrderConfirmationPage';
import DriverLayout from './components/pages/drivers/layout/DriverLayout';
import DriversDash from './components/pages/drivers/driversDash';
import DriverLogin from './components/pages/drivers/auth/DriverLogin';
import DriverDeliveries from './components/pages/drivers/driverDeliveries';
import DriverRevenue from './components/pages/drivers/driverRevenue';
import FloatingSupport from './components/common/FloatingSupport';
import PaymentCancelledPage from './components/pages/storepages/cart/PaymentCancelledPage';
import SharedCartPage from './components/pages/storepages/cart/SharedCartPage';
import BuyerLayout from './components/pages/buyers/BuyerLayout';
import BuyerPriceUpdates from './components/pages/buyers/BuyerPriceUpdates';

function App() {
  return (
    <Router>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <WazeRouteProvider>
              <ScrollToTop />
              <Routes>
                <Route path="/register" element={<UserRegistration />} /> 
                <Route path="/login" element={<LoginPage />} />
                <Route path="/adminlogin" element={<AdminLogin />} />
                
                {/* Protected admin route */}
                <Route path="/admindashboard" element={
                  <ProtectedRoute redirectTo="/adminlogin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/driver-login" element={<DriverLogin />} />

                {/* Protected driver routes */}
                <Route path="/driver" element={
                  <ProtectedRoute redirectTo="/driver-login">
                    <DriverLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<DriversDash />} />
                  <Route path="deliveries/:orderId" element={<DriverDeliveries />} />
                  <Route path="revenue" element={<DriverRevenue />} />
                </Route>
                
                {/* Buyer Routes */}
                <Route path="/buyer" element={
                  <ProtectedRoute redirectTo="/login">
                    <BuyerLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<DriversDash />} />
                  <Route path="deliveries/:orderId" element={<DriverDeliveries />} />
                  <Route path="revenue" element={<DriverRevenue />} />
                </Route>
                
                <Route path="/driversdashboard" element={<Navigate to="/driver/dashboard" replace />} />
                
                <Route path="/" element={<LayOut />}>
                  <Route index element={<HomePage />} /> 
                  
                  {/* Protected user routes */}
                  <Route path="/useraccount" element={
                    <ProtectedRoute>
                      <UserAccount />
                    </ProtectedRoute>
                  } />
                  <Route path="/userprofile" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/messages" element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/userorders" element={
                    <ProtectedRoute>
                      <UserOrders />
                    </ProtectedRoute>
                  } />
                  
                  {/* Public routes */}
                  <Route path="product/:id" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/shared-cart" element={<SharedCartPage />} />
                  
                  {/* Protected checkout route */}
                  <Route path="/checkout" element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
                  <Route path="/payment-cancelled/:id" element={<PaymentCancelledPage />} />
                  <Route path="/shop" element={<StoreCategories />} />
                  <Route path="/support" element={<SupportPage />} />
                </Route>
              </Routes>
              <FloatingSupport />
            </WazeRouteProvider>
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
