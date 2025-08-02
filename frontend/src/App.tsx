import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import UserRegistration from './components/pages/userpages/userReg';
import HomePage from './components/pages/storepages/homepage';



function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/userregister" element={<UserRegistration />} />
      </Routes>
    </Router>
  )
}

export default App
