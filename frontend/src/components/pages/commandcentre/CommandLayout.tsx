import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAuth, signOut, getIdTokenResult } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import './commandcentre.css';

const NAV_ITEMS = [
  { to: 'dashboard',     label: 'Dashboard',      icon: '📊' },
  { to: 'stores',        label: 'Stores',          icon: '🏪' },
  { to: 'receipts',      label: 'Receipts',        icon: '🧾' },
  { to: 'deliveries',    label: 'Deliveries',      icon: '🚚' },
  { to: 'payments',      label: 'Payments',        icon: '💳' },
  { to: 'driver-revenue',label: 'Driver Revenue',  icon: '👤' },
  { to: 'metrics',       label: 'Metrics',         icon: '📈' },
  { to: 'pricing',       label: 'Pricing Config',  icon: '⚙️' },
];

const CommandLayout = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        // Check 1: Command Centre simple auth flow (email + password via /api/admin/auth)
        const commandCentreAuth = sessionStorage.getItem('commandCentreAuth');
        if (commandCentreAuth === 'true') {
          setChecking(false);
          return;
        }

        // Check 2: Firebase OAuth admin flow (existing loginPage.tsx flow)
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
          navigate('/commandlogin', { replace: true });
          return;
        }
        const tokenResult = await getIdTokenResult(user);
        if (tokenResult.claims['role'] !== 'admin') {
          navigate('/commandlogin', { replace: true });
          return;
        }
        setChecking(false);
      } catch {
        navigate('/commandlogin', { replace: true });
      }
    };
    verifyAdmin();
  }, []);

  if (checking) {
    return <div className="cc-checking">Verifying access...</div>;
  }

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="cc-shell">
      {/* ── Sidebar ── */}
      <aside className="cc-sidebar">
        <div className="cc-sidebar-brand">
          <span className="cc-brand-badge">CC</span>
          <span className="cc-brand-name">Command Centre</span>
        </div>

        <nav className="cc-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `cc-nav-link${isActive ? ' cc-nav-link--active' : ''}`}
            >
              <span className="cc-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="cc-signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="cc-main">
        <Outlet />
      </main>
    </div>
  );
};

export default CommandLayout;
