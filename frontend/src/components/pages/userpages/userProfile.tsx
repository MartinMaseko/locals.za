import React from 'react';
import './userstyle.css';

const UserProfile: React.FC = () => {
  return (
    <div className="profile-container">
        <img
          className="profile-picture"
          src="https://img.icons8.com/pulsar-line/80/ffb803/user.png"
          alt="user"
        />
        <h1>User Profile</h1>
      </div>
  );
};

export default UserProfile;