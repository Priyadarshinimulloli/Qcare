
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import PatientDashboard from './components/PatientDashboard';
import HealthTips from './pages/HealthTips';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './components/AdminDashboard';
import Analytics from './components/Analytics';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login mode="patient" />} />
      <Route path="/admin-login" element={<Login mode="admin" />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/patient" element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>} />
      <Route path="/health-tips" element={<ProtectedRoute><HealthTips /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
    </Routes>
  );
}

export default App;
