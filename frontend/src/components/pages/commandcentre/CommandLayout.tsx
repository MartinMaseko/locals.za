import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAuth, signOut, getIdTokenResult } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import lzaIcon from '../../assets/logos/LZA ICON.png';
import './commandcentre.css';

const NAV_ITEMS = [
  { to: 'deliveries',     label: 'Deliveries' },
  { to: 'stores',         label: 'Stores' },
  { to: 'receipts',       label: 'Receipts' },
  { to: 'drivers',        label: 'Drivers' },
  { to: 'driver-revenue', label: 'Driver Revenue' },
  { to: 'metrics',        label: 'Metrics' },
  { to: 'pricing',        label: 'Pricing Config' },
];

const CommandLayout = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        // Check 1: Command Centre simple auth flow (email + password via /api/admin/auth)
        const commandCentreAuth = sessionStorage.getItem('commandCentreAuth');
        const authToken         = sessionStorage.getItem('authToken');
        if (commandCentreAuth === 'true' && authToken?.startsWith('commandadmin:')) {
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
    const isCommandCentreAuth = sessionStorage.getItem('commandCentreAuth') === 'true';
    if (isCommandCentreAuth) {
      sessionStorage.removeItem('commandCentreAuth');
      sessionStorage.removeItem('commandCentreEmail');
      sessionStorage.removeItem('authToken');
      navigate('/commandlogin', { replace: true });
    } else {
      await signOut(auth);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className={`cc-shell${menuOpen ? ' cc-shell--menu-open' : ''}`}>
      {/* ── Mobile top bar ── */}
      <header className="cc-mobile-header">
        <div className="cc-mobile-brand">
          <img src={lzaIcon} alt="LZA" className="cc-brand-badge" />
          <span className="cc-brand-name">Command Centre</span>
        </div>
        <button
          className="cc-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* ── Dropdown overlay (mobile) / backdrop ── */}
      {menuOpen && (
        <div className="cc-menu-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className="cc-sidebar">
        <div className="cc-sidebar-brand">
          <img src={lzaIcon} alt="LZA" className="cc-brand-badge" />
          <span className="cc-brand-name">Command Centre</span>
        </div>

        <nav className="cc-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `cc-nav-link${isActive ? ' cc-nav-link--active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {/* icon slot — drop an <img> or <svg> here when assets are ready */}
              <span className="cc-nav-icon" />
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
