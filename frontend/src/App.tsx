import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css';
import { AuthProvider } from './Auth/AuthProvider';
import { ProtectedRoute } from './Auth/ProtectedRoute';  
import LayOut from './components/pages/LayOut';
import UserAccount from './components/pages/userpages/userAccount';
import UserProfile from './components/pages/userpages/userProfile';
import UserOrders from './components/pages/userpages/userOrders';
import LoginPage from './components/pages/storepages/loginPage';
import AdminLogin from './components/pages/dashboard/adminLogin'
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
import DriverLogin from './components/pages/drivers/auth/DriverLogin';
import DriverDeliveries from './components/pages/drivers/driverDeliveries';
import DriverRevenue from './components/pages/drivers/driverRevenue';
import PaymentCancelledPage from './components/pages/storepages/cart/PaymentCancelledPage';
import SharedCartPage from './components/pages/storepages/cart/SharedCartPage';
import BuyerPriceUpdates from './components/pages/buyers/BuyerPriceUpdates';
import BuyerLogin from './components/pages/buyers/BuyerLogin';
import BuyerOrders from './components/pages/buyers/BuyerOrders';
import SalesLogin from './components/pages/sales/SalesLogin';
import AddCustomer from './components/pages/sales/AddCustomer';
import ViewCustomers from './components/pages/sales/ViewCustomers';
import SalesRevenue from './components/pages/sales/SalesRevenue';
import SalesShop from './components/pages/sales/SalesShop';
import SalesCart from './components/pages/sales/SalesCart';
import SalesTraining from './components/pages/sales/salesTraining';
import SalesProtectedRoute from './Auth/SalesProtectedRoute';
import SEOHead from './components/SEO/SEOHead';
import StructuredData from './components/SEO/StructuredData';

// Lazy load heavy pages
const AdminDashboard = lazy(() => import('./components/pages/dashboard/adminDashboard'));
const DriversDash = lazy(() => import('./components/pages/drivers/driversDash'));
const BuyerLayout = lazy(() => import('./components/pages/buyers/BuyerLayout'));
const SalesLayout = lazy(() => import('./components/pages/sales/SalesLayout'));

// Create a simple Loading component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
    <img src="path/to/locals-svg.gif" alt="Loading..." width="50" height="50" />
  </div>
);

function App() {
  return (
    <>
      <Router>
        <SEOHead />
        <StructuredData 
          type="Organization" 
          data={{
            name: "LocalsZA",
            url: "https://locals-za.co.za",
            logo: "https://locals-za.co.za/assets/logos/LZA ICON.png",
            description: "Spaza shop, salon and fast food Online Cash and Carry supply chain aggregator for SMME's"
          }} 
        />
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <WazeRouteProvider>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/register" element={<UserRegistration />} /> 
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/adminlogin" element={<AdminLogin />} />
                    
                    <Route path="/admindashboard" element={
                      <ProtectedRoute redirectTo="/adminlogin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/driver-login" element={<DriverLogin />} />
                    
                    <Route path="/driver" element={
                      <ProtectedRoute redirectTo="/driver-login">
                        <DriverLayout />
                      </ProtectedRoute>
                    }>
                      <Route path="dashboard" element={<DriversDash />} />
                      <Route path="deliveries/:orderId" element={<DriverDeliveries />} />
                      <Route path="revenue" element={<DriverRevenue />} />
                    </Route>
                    
                    <Route path="/buyer-login" element={<BuyerLogin/>} />
                    <Route path="/buyer" element={
                      <ProtectedRoute redirectTo="/buyer-login">
                        <BuyerLayout />
                      </ProtectedRoute>
                    }>
                      <Route path="orders" element={<BuyerOrders />} />
                      <Route path="price-updates" element={<BuyerPriceUpdates />} />
                      <Route index element={<Navigate to="orders" replace />} />
                    </Route>
                    
                    <Route path="/sales/login" element={<SalesLogin />} />
                    <Route path="/sales" element={
                      <SalesProtectedRoute redirectTo="/sales/login">
                        <SalesLayout />
                      </SalesProtectedRoute>
                    }>
                      <Route path="add-customer" element={<AddCustomer />} />
                      <Route path="customers" element={<ViewCustomers />} />
                      <Route path="shop" element={<SalesShop />} />
                      <Route path="cart" element={<SalesCart />} />
                      <Route path="revenue" element={<SalesRevenue />} />
                      <Route path="training" element={<SalesTraining />} />
                      <Route index element={<Navigate to="add-customer" replace />} />
                    </Route>
                    
                    <Route path="/driversdashboard" element={<Navigate to="/driver/dashboard" replace />} />
                    
                    <Route path="/" element={<LayOut />}>
                      <Route index element={<HomePage />} /> 
                      
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
                      
                      <Route path="product/:id" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/shared-cart" element={<SharedCartPage />} />
                      
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
                </Suspense>
              </WazeRouteProvider>
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;
