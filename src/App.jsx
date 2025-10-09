
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import Home from './pages/Home'; // Updated path
import AdminDashboard from './components/AdminDashboard';
import Analytics from './components/Analytics';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<Home />} />  {/* Home page route */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  );
}

export default App;
