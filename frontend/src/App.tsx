import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'

import UserProfile from './components/pages/userpages/userProfile';
import LoginPage from './components/pages/storepages/loginPage';
import DriversDash from './components/pages/drivers/driversDash';
import AdminLogin from './components/pages/dashboard/adminLogin'
import AdminDashboard from './components/pages/dashboard/adminDashboard';
import UserRegistration from './components/pages/userpages/userReg'; 
import HomePage from './components/pages/storepages/homePage';
function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/register" element={<UserRegistration />} /> 
        <Route path="/login" element={<LoginPage />} />
        <Route path="/userprofile" element={<UserProfile />} />
        <Route path="/driversdashboard" element={<DriversDash />} />
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/admindashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  )
}

export default App
