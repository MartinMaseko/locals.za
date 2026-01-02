import { Routes, Route } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import SalesLogin from './SalesLogin';
import AddCustomer from './AddCustomer';
import ViewCustomers from './ViewCustomers';
import SalesRevenue from './SalesRevenue';
import SalesShop from './SalesShop';
import SalesCart from './SalesCart';

const SalesRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<SalesLogin />} />
      <Route element={<SalesLayout />}>
        <Route path="add-customer" element={<AddCustomer />} />
        <Route path="customers" element={<ViewCustomers />} />
        <Route path="shop" element={<SalesShop />} />
        <Route path="cart" element={<SalesCart />} />
        <Route path="revenue" element={<SalesRevenue />} />
      </Route>
    </Routes>
  );
};

export default SalesRoutes;