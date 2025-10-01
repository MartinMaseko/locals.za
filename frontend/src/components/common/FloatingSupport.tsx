import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FloatingSupport.css';

const FloatingSupport: React.FC = () => {
  const navigate = useNavigate();
  
  const handleSupportClick = () => {
    navigate('/support');
  };

  return (
    <div className="floating-support-container">
      <button 
        className="floating-support-button"
        onClick={handleSupportClick}
        aria-label="Get Support"
      >
        <div className="support-icon-wrapper">
          <img 
            width="45" 
            height="45" 
            src="https://img.icons8.com/material-outlined/48/online-support.png" 
            alt="Support"
          />
        </div>
        <span className="support-tooltip">Need Help?</span>
      </button>
    </div>
  );
};

export default FloatingSupport;