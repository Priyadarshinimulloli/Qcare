import './App.css'
import { useEffect, useState } from 'react'
import AdminDashboard from './components/AdminPanel/AdminDashboard'

function Landing({ onAdminClick, onPatientClick }) {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="18" y="8" width="4" height="24" fill="#2563eb"/>
                <rect x="8" y="18" width="24" height="4" fill="#2563eb"/>
                <circle cx="20" cy="20" r="18" stroke="#2563eb" strokeWidth="2"/>
              </svg>
            </div>
            <h1 className="hospital-name">MediCare Hospital</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="welcome-section">
          <h2 className="welcome-title">Welcome to MediCare Hospital</h2>
          <p className="welcome-subtitle">
            Providing exceptional healthcare services with compassion and excellence. 
            Choose your access point below to get started.
          </p>
        </div>

        <div className="navigation-buttons">
          <button 
            className="nav-button patient-button"
            onClick={onPatientClick}
            aria-label="Access Patient Portal"
          >
            <div className="button-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12C27.3137 12 30 14.6863 30 18C30 21.3137 27.3137 24 24 24C20.6863 24 18 21.3137 18 18C18 14.6863 20.6863 12 24 12Z" fill="white"/>
                <path d="M12 36C12 30.4772 16.4772 26 22 26H26C31.5228 26 36 30.4772 36 36V38H12V36Z" fill="white"/>
              </svg>
            </div>
            <div className="button-content">
              <h3 className="button-title">Patient Portal</h3>
              <p className="button-description">Access your health records, appointments, and test results</p>
            </div>
          </button>

          <button 
            className="nav-button admin-button"
            onClick={onAdminClick}
            aria-label="Access Admin Dashboard"
          >
            <div className="button-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 6L30 12H18L24 6Z" fill="white"/>
                <rect x="10" y="12" width="28" height="24" rx="2" fill="white"/>
                <rect x="14" y="18" width="8" height="2" fill="#1e40af"/>
                <rect x="14" y="22" width="12" height="2" fill="#1e40af"/>
                <rect x="14" y="26" width="10" height="2" fill="#1e40af"/>
                <circle cx="32" cy="32" r="6" fill="#dc2626"/>
                <path d="M29 32L31 34L35 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="button-content">
              <h3 className="button-title">Admin Login</h3>
              <p className="button-description">Access administrative dashboard and management tools</p>
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="contact-info">
            <div className="contact-item">
              <span className="contact-label">Phone:</span>
              <span className="contact-value">(555) 123-4567</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Emergency:</span>
              <span className="contact-value">911</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Address:</span>
              <span className="contact-value">123 Healthcare Blvd, Medical District</span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 MediCare Hospital. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  const [path, setPath] = useState(window.location.pathname || '/')

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to) => {
    if (to === path) return
    window.history.pushState({}, '', to)
    setPath(to)
  }

  const handlePatientPortal = () => {
    // placeholder: navigate to patient portal or external page
    console.log('Navigating to Patient Portal')
    // example: navigate('/patient')
  }

  const handleAdminLogin = () => {
    navigate('/admin')
  }

  if (path === '/admin') {
    return (
      <div>
        <nav className="top-nav">
          <button className="nav-home btn" onClick={() => navigate('/')}>Home</button>
        </nav>
        <AdminDashboard />
      </div>
    )
  }

  return <Landing onAdminClick={handleAdminLogin} onPatientClick={handlePatientPortal} />
}

export default App
