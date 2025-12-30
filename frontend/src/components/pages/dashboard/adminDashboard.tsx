import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import Logo from '../../assets/logos/LZA ICON.png';
import './AdminStyle.css';

// Import custom hooks
import { useOrders } from './hooks/useOrders';
import { useProducts } from './hooks/useProducts';
import { useDrivers } from './hooks/useDrivers';
import { useTokenManagement } from './hooks/useTokenManagement';
import {
  useFetchCustomerDetails,
  useFetchDriversList,
  useFetchDriverOrders,
  useFetchPaymentHistory,
  useCashoutRequests
} from './hooks/useFetch';
import { adminApi } from './services/adminApi';

// Import section components
import DashboardSection from './sections/DashboardSection';
import RegisterDriverSection from './sections/RegisterDriverSection';
import AddProductSection from './sections/AddProductSection';
import PromoteAdminSection from './sections/PromoteAdminSection';
import ManageOrdersSection from './sections/ManageOrdersSection';
import ProductManagementSection from './sections/ProductManagementSection';
import ManageDriversSection from './sections/ManageDriversSection';
import ProcurementSection from './sections/ProcurementSection';
import DiscountAnalyticsSection from './sections/DiscountAnalyticsSection';
const ClientSection = lazy(() => import('./sections/ClientSection'));

import type { AdminProfile } from './types/index';


type ActiveSection = 'dashboard' | 'drivers' | 'products' | 'admin' | 'orders' | 'ProductManagement' | 'ManageDrivers' | 'procurement' | 'clients' | 'discount-analytics';

interface SectionConfig {
  id: ActiveSection;
  label: string;
  component: React.ComponentType<any>;
}

const SECTIONS: SectionConfig[] = [
  { id: 'dashboard', label: 'Dashboard', component: DashboardSection },
  { id: 'drivers', label: 'Register Driver', component: RegisterDriverSection },
  { id: 'ManageDrivers', label: 'Manage Drivers', component: ManageDriversSection },
  { id: 'products', label: 'Add Product', component: AddProductSection },
  { id: 'ProductManagement', label: 'Manage Products', component: ProductManagementSection },
  { id: 'admin', label: 'Promote to Admin', component: PromoteAdminSection },
  { id: 'orders', label: 'Manage Orders', component: ManageOrdersSection },
  { id: 'clients', label: 'Clients', component: ClientSection },
  { id: 'procurement', label: 'Procurement', component: ProcurementSection },
  { id: 'discount-analytics', label: 'Discount Analytics', component: DiscountAnalyticsSection }
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Custom hooks for token and data management
  const { getToken } = useTokenManagement();
  const { customerDetails, fetchCustomerDetails } = useFetchCustomerDetails();
  const { driversList, fetchDriversList } = useFetchDriversList();
  const { driverOrders, fetchDriverOrders } = useFetchDriverOrders();
  const { driverPaymentHistory, paymentHistoryLoading, fetchPaymentHistory } = useFetchPaymentHistory();
  const { 
    cashoutList, 
    setCashoutList, 
    cashoutLoading, 
    cashoutError, 
    fetchCashoutRequests 
  } = useCashoutRequests();

  // Global admin state
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  // Use custom hooks for data management
  const ordersState = useOrders();
  const productsState = useProducts();
  const driversState = useDrivers();

  // Auth check
  useEffect(() => {
    const auth = getAuth(app);
    setLoading(true);
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/adminlogin'); return; }
      try {
        const profile = await adminApi.getAdminProfile();
        if ((profile as any)?.user_type !== 'admin') { navigate('/adminlogin'); return; }
        setAdmin(profile as AdminProfile);
      } catch (err) {
        navigate('/adminlogin');
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  // Auto-fetch data when section changes
  useEffect(() => {
    if (!admin) return;

    switch(activeSection) {
      case 'orders':
        ordersState.fetchOrders('');
        driversState.fetchDrivers();
        break;
      case 'clients':
        ordersState.fetchOrders('');
        break;
      case 'ProductManagement':
        productsState.fetchProducts();
        break;
      case 'ManageDrivers':
        driversState.fetchAllDrivers();
        fetchDriversList(getToken);
        fetchCashoutRequests();
        break;
      default:
        break;
    }
  }, [activeSection, admin]);

  // Keyboard close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
      } 
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleSignOut = async () => {
    try {
      const auth = getAuth(app);
      await signOut(auth);
      navigate('/adminlogin');
    } catch (err) { 
      console.error('Sign out error', err); 
    }
  };

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const SectionComponent = currentSection?.component;

  const sharedProps = {
    admin,
    getToken,
    ordersState,
    productsState,
    driversState,
    customerDetails,
    fetchCustomerDetails,
    driversList,
    fetchDriversList,
    driverOrders,
    fetchDriverOrders,
    driverPaymentHistory,
    paymentHistoryLoading,
    fetchPaymentHistory,
    cashoutList,
    setCashoutList,
    cashoutLoading,
    cashoutError,
    fetchCashoutRequests
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-layout">
        <div className="admin-sidebar">
          <div className="admin-header">
            <img src={Logo} className='dashLogo' alt='Logo' />
            <h3>Dashboard</h3>
            <div className="admin-info">{admin?.full_name || admin?.email}</div>
          </div>

          <nav className="admin-nav">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
            <div className="nav-spacer" />
            <button className="nav-item signout-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </nav>
        </div>

        <div className="admin-content">
          {SectionComponent && (
            <Suspense fallback={<div className="loading-indicator">Loading section...</div>}>
              <SectionComponent {...sharedProps} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;