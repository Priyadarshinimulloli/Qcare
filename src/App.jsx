import { Routes, Route,useParams } from 'react-router-dom'
import './App.css'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Register from './components/Register'
import Home from './components/Home'
import AdminDashboard from './components/AdminDashboard'
import PatientDashboard from "./components/PatientDashboard";
import Analytics from './components/Analytics'
const PatientDashboardWrapper = () => {
  const { queueId } = useParams();
  return <PatientDashboard queueId={queueId} />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<Home />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/patient/:queueId" element={<PatientDashboardWrapper />} />
    </Routes>
  )
}

export default App
