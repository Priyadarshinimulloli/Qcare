import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // You can add Firebase signOut here later if needed
    navigate('/');
  };

  return (
    <div className="home-page">
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="18" y="8" width="4" height="24" fill="#2563eb"/>
                <rect x="8" y="18" width="24" height="4" fill="#2563eb"/>
                <circle cx="20" cy="20" r="18" stroke="#2563eb" strokeWidth="2"/>
              </svg>
            </div>
            <h1 className="hospital-name">MediCare Hospital</h1>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <main className="home-main">
        <div className="welcome-container">
          <h2>Welcome to Patient Portal</h2>
          <p>You have successfully logged in to your patient account.</p>
          
          <div className="portal-features">
            <div className="feature-card">
              <h3>Medical Records</h3>
              <p>View your medical history and test results</p>
            </div>
            <div className="feature-card">
              <h3>Appointments</h3>
              <p>Schedule and manage your appointments</p>
            </div>
            <div className="feature-card">
              <h3>Prescriptions</h3>
              <p>View and manage your prescriptions</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
