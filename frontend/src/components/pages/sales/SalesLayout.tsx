import { Outlet } from 'react-router-dom';
import SalesNav from './SalesNav';
import '../buyers/buyerLayout.css';

const SalesLayout = () => {
  return (
    <div className="buyer-layout">
      <SalesNav />
      <main className="buyer-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default SalesLayout;
