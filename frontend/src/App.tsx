import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css';
import { AuthProvider } from './Auth/AuthProvider';
import { ProtectedRoute } from './Auth/ProtectedRoute';
import { CommandProtectedRoute } from './Auth/CommandProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { WazeRouteProvider } from './components/contexts/WazeRouteContext';
import SEOHead from './components/SEO/SEOHead';
import StructuredData from './components/SEO/StructuredData';
import PWAInstallBanner from './components/pwa/PWAInstallBanner';
import UpdateBanner from './components/pwa/UpdateBanner';

// ── Critical path (landing = /order/select-store) — kept eager ───────────────
import LayOut from './components/pages/LayOut';
import WholesaleLayout from './components/pages/storepages/userjourney/WholesaleLayout';
import SelectStore from './components/pages/storepages/userjourney/SelectStore';

// ── Auth / one-shot pages ─────────────────────────────────────────────────────
const LoginPage       = lazy(() => import('./components/pages/storepages/loginPage'));
const UserRegistration = lazy(() => import('./components/pages/userpages/userReg'));
const CommandLogin    = lazy(() => import('./components/pages/commandcentre/commandLogin'));
const DriverLogin        = lazy(() => import('./components/pages/drivers/auth/DriverLogin'));
const DriverRegistration = lazy(() => import('./components/pages/drivers/DriverRegistration'));

// ── Authenticated user pages ──────────────────────────────────────────────────
const UserAccount  = lazy(() => import('./components/pages/userpages/userAccount'));
const UserProfile  = lazy(() => import('./components/pages/userpages/userProfile'));
const UserOrders   = lazy(() => import('./components/pages/userpages/userOrders'));
const MessagesPage = lazy(() => import('./components/pages/storepages/messages/messagesPage'));
const SupportPage  = lazy(() => import('./components/pages/storepages/support/supportPage'));
const CalculatorPage = lazy(() => import('./components/pages/storepages/calculator/CalculatorPage'));

// ── Order journey (sequential after SelectStore — lazy is fine) ───────────────
const UploadReceipt = lazy(() => import('./components/pages/storepages/userjourney/UploadReceipt'));
const DeliveryPage  = lazy(() => import('./components/pages/storepages/userjourney/DeliveryPage'));
const PaymentPage   = lazy(() => import('./components/pages/storepages/userjourney/PaymentPage'));
const PaymentResult = lazy(() => import('./components/pages/storepages/userjourney/PaymentResult'));

// ── Driver app ────────────────────────────────────────────────────────────────
const DriverLayout     = lazy(() => import('./components/pages/drivers/layout/DriverLayout'));
const DriversDash      = lazy(() => import('./components/pages/drivers/driversDash'));
const DriverDeliveries = lazy(() => import('./components/pages/drivers/driverDeliveries'));
const DriverRevenue    = lazy(() => import('./components/pages/drivers/driverRevenue'));

// ── Command Centre (admin-only — never on the critical path) ──────────────────
const CommandLayout = lazy(() => import('./components/pages/commandcentre/CommandLayout'));
const CCDashboard   = lazy(() => import('./components/pages/commandcentre/pages/Dashboard'));
const CCStores      = lazy(() => import('./components/pages/commandcentre/pages/Stores'));
const CCPayments    = lazy(() => import('./components/pages/commandcentre/pages/Payments'));
const CCReceipts    = lazy(() => import('./components/pages/commandcentre/pages/Receipts'));
const CCDeliveries  = lazy(() => import('./components/pages/commandcentre/pages/Deliveries'));
const CCDrivers     = lazy(() => import('./components/pages/commandcentre/pages/Drivers'));
const CCDriverRev   = lazy(() => import('./components/pages/commandcentre/pages/DriverRevenue'));
const CCMetrics     = lazy(() => import('./components/pages/commandcentre/pages/Metrics'));
const CCPricing     = lazy(() => import('./components/pages/commandcentre/pages/PricingConfig'));

// ── Suspense fallback ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100dvh', background: '#090909',
  }}>
    <div style={{
      width: 36, height: 36,
      border: '3px solid rgba(255,184,3,0.15)',
      borderTopColor: '#FFB803',
      borderRadius: '50%',
      animation: 'lza-spin 0.65s linear infinite',
    }} />
    <style>{`@keyframes lza-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <>
      <Router>
        <SEOHead />
        <StructuredData
          type="Organization"
          data={{
            name:        'LocalsZA',
            url:         'https://locals-za.co.za',
            logo:        'https://locals-za.co.za/assets/logos/LZA ICON.png',
            description: "Spaza shop, salon and fast food Online Cash and Carry supply chain aggregator for SMME's",
          }}
        />
        <AuthProvider>
          <WazeRouteProvider>
            <ScrollToTop />
            {/* PWA update bar — appears at top when a new version is waiting */}
            <UpdateBanner />
            {/* PWA install sheet — mounted globally; auto-shows on /order/select-store */}
            <PWAInstallBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>

                {/* ── Public one-shot pages ─────────────────────────────── */}
                <Route path="/register"    element={<UserRegistration />} />
                <Route path="/login"       element={<LoginPage />} />
                <Route path="/commandlogin" element={<CommandLogin />} />
                <Route path="/driverlogin"    element={<DriverLogin />} />
                <Route path="/driver-register" element={<DriverRegistration />} />

                {/* ── Driver app ────────────────────────────────────────── */}
                <Route
                  path="/driver"
                  element={
                    <ProtectedRoute redirectTo="/driverlogin">
                      <DriverLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard"             element={<DriversDash />} />
                  <Route path="deliveries/:orderId"   element={<DriverDeliveries />} />
                  <Route path="revenue"               element={<DriverRevenue />} />
                </Route>

                {/* Legacy redirect from old dashboard URL */}
                <Route path="/driversdashboard" element={<Navigate to="/driver/dashboard" replace />} />

                {/* ── Order journey (critical path) ─────────────────────── */}
                <Route path="/order" element={<WholesaleLayout />}>
                  <Route index element={<Navigate to="select-store" replace />} />
                  <Route path="select-store"  element={<SelectStore />} />
                  <Route path="upload-receipt" element={<UploadReceipt />} />
                  <Route path="delivery"      element={<DeliveryPage />} />
                  <Route path="payment"       element={<PaymentPage />} />
                  <Route path="payment/success/:orderId"   element={<PaymentResult status="success" />} />
                  <Route path="payment/cancelled/:orderId" element={<PaymentResult status="cancelled" />} />
                  <Route path="payment/error/:orderId"     element={<PaymentResult status="error" />} />
                </Route>

                {/* ── Main shell (authenticated user pages) ─────────────── */}
                <Route path="/" element={<LayOut />}>
                  <Route index element={<Navigate to="/order/select-store" replace />} />
                  <Route path="/useraccount" element={
                    <ProtectedRoute><UserAccount /></ProtectedRoute>
                  } />
                  <Route path="/userprofile" element={
                    <ProtectedRoute><UserProfile /></ProtectedRoute>
                  } />
                  <Route path="/messages" element={
                    <ProtectedRoute><MessagesPage /></ProtectedRoute>
                  } />
                  <Route path="/userorders" element={
                    <ProtectedRoute><UserOrders /></ProtectedRoute>
                  } />
                  <Route path="/support"     element={<SupportPage />} />
                  <Route path="/calculator"  element={<CalculatorPage />} />
                </Route>

                {/* ── Command Centre (admin-only) ───────────────────────── */}
                <Route
                  path="/commandcentre"
                  element={
                    <CommandProtectedRoute>
                      <CommandLayout />
                    </CommandProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="deliveries" replace />} />
                  <Route path="dashboard"      element={<CCDashboard />} />
                  <Route path="stores"         element={<CCStores />} />
                  <Route path="payments"       element={<CCPayments />} />
                  <Route path="receipts"       element={<CCReceipts />} />
                  <Route path="deliveries"     element={<CCDeliveries />} />
                  <Route path="drivers"        element={<CCDrivers />} />
                  <Route path="driver-revenue" element={<CCDriverRev />} />
                  <Route path="metrics"        element={<CCMetrics />} />
                  <Route path="pricing"        element={<CCPricing />} />
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
