import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Registered user:", userCredential.user);
      setSuccess("Registration successful! Redirecting to patient portal...");
      
      // Redirect to home after successful registration
      setTimeout(() => {
        navigate("/home");
      }, 2000);
    } catch (err) {
      console.error("Registration error:", err);
      // Handle different error types
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError("An account with this email already exists. Please use a different email or try logging in.");
          break;
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/weak-password':
          setError("Password is too weak. Please choose a stronger password.");
          break;
        default:
          setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="register-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={handleBackToHome} style={{ cursor: 'pointer' }}>
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
      <main className="register-main">
        <div className="register-container">
          <div className="register-header">
            <h2>Create Patient Account</h2>
            <p>Join MediCare Hospital to access your personalized patient portal</p>
          </div>
          
          <form onSubmit={handleRegister} className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Enter your first name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a password (min. 6 characters)"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <button type="submit" className="register-button" disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2C11.3137 2 12 2.6863 12 4C12 5.3137 11.3137 6 10 6C8.6863 6 8 5.3137 8 4C8 2.6863 8.6863 2 10 2Z" fill="currentColor"/>
                <path d="M4 18C4 14.4772 6.4772 12 10 12C13.5228 12 16 14.4772 16 18V18H4V18Z" fill="currentColor"/>
              </svg>
              {loading ? "Creating Account..." : "Create Patient Account"}
            </button>
          </form>
          
          <div className="register-footer">
           <p>Already have an account?{" "}
           <Link to="/login" className="login-link">
            Sign in here
           </Link>
           </p>
            <button onClick={handleBackToHome} className="back-button">
              ← Back to Home
              </button>

            </div>

        </div>
      </main>
    </div>
  );
};

export default Register;