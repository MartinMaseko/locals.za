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
import UserRegistration from './components/pages/userpages/userReg'; 
import MessagesPage from './components/pages/storepages/messages/messagesPage';
import SupportPage from './components/pages/storepages/support/supportPage';
import ScrollToTop from './components/ScrollToTop';
import { WazeRouteProvider } from './components/contexts/WazeRouteContext';
import DriverLayout from './components/pages/drivers/layout/DriverLayout';
import DriverLogin from './components/pages/drivers/auth/DriverLogin';
import DriverDeliveries from './components/pages/drivers/driverDeliveries';
import DriverRevenue from './components/pages/drivers/driverRevenue';
import SEOHead from './components/SEO/SEOHead';
import StructuredData from './components/SEO/StructuredData';
import WholesaleLayout from './components/pages/storepages/userjourney/WholesaleLayout';
import SelectStore from './components/pages/storepages/userjourney/SelectStore';
import UploadReceipt from './components/pages/storepages/userjourney/UploadReceipt';
import DeliveryPage from './components/pages/storepages/userjourney/DeliveryPage';
import PaymentPage from './components/pages/storepages/userjourney/PaymentPage';

// Lazy load heavy pages
const DriversDash = lazy(() => import('./components/pages/drivers/driversDash'));

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
          <WazeRouteProvider>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/register" element={<UserRegistration />} /> 
                <Route path="/login" element={<LoginPage />} />
                <Route path="/driverlogin" element={<DriverLogin />} />
                
                <Route path="/driver" element={
                  <ProtectedRoute redirectTo="/driverlogin">
                    <DriverLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<DriversDash />} />
                  <Route path="deliveries/:orderId" element={<DriverDeliveries />} />
                  <Route path="revenue" element={<DriverRevenue />} />
                </Route>
                
                <Route path="/driversdashboard" element={<Navigate to="/driver/dashboard" replace />} />
                
                <Route path="/order" element={<WholesaleLayout />}>
                  <Route index element={<Navigate to="select-store" replace />} />
                  <Route path="select-store" element={<SelectStore />} />
                  <Route path="upload-receipt" element={<UploadReceipt />} />
                  <Route path="delivery" element={<DeliveryPage />} />
                  <Route path="payment" element={<PaymentPage />} />
                </Route>

                <Route path="/" element={<LayOut />}>
                  <Route index element={<Navigate to="/order/select-store" replace />} />
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
                  <Route path="/support" element={<SupportPage />} />
                </Route>
              </Routes>
            </Suspense>
          </WazeRouteProvider>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;
