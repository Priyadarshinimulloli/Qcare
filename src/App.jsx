
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home'; // Updated path to components
import PatientDashboard from './components/PatientDashboard';
import HealthTips from './pages/HealthTips';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/AdminDashboard';
import Analytics from './components/Analytics';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
  <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />  {/* Home page route */}
  <Route path="/patient" element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>} />
  <Route path="/health-tips" element={<ProtectedRoute><HealthTips /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  );
}

export default App;
