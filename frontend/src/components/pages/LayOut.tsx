import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './storepages/navbar/navbar';
import AppNav from './storepages/appnav/appnav';
import LoadingContext from './storepages/LoadingContext';

const Layout: React.FC = () => {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {/* Navbar & AppNav hidden while any page sets loading = true */}
      {!loading && <Navbar />}
      <main className="main-content">
        <Outlet />
      </main>
      {!loading && <AppNav />}
    </LoadingContext.Provider>
  );
};

export default Layout;