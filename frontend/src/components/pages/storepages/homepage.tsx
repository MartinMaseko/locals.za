import React from 'react';
import { useAuth } from '../../../Auth/AuthProvider';

const HomePage: React.FC = () => {
  const auth = useAuth();
  const name =
    auth?.currentUser?.full_name ||
    auth?.currentUser?.user_metadata?.full_name ||
    auth?.currentUser?.email ||
    '';

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>
        Welcome to the Home Page
        {name ? `, ${name}` : ''}
      </h1>
      <p>This is your starting point. Explore the app!</p>
    </div>
  );
};

export default HomePage;