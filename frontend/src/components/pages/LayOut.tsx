import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './storepages/navbar/navbar';
import AppNav from './storepages/appnav/appnav';
import LoadingContext from './storepages/LoadingContext';
import LogoAnime from '../storepages/../assets/logos/locals-svg.gif';

const Layout: React.FC = () => {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {/* hide navs while loading */}
      {!loading && <Navbar />}
      <main className="main-content">
        <Outlet />
      </main>
      {!loading && <AppNav />}

      {/* Global loading overlay shown when any page sets loading = true */}
      {loading && (
        <div className="loading-container global">
          <img src={LogoAnime} alt="Loading..." className="loading-gif" />
          Loading...
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export default Layout;