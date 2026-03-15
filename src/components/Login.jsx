import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const getResetActionSettings = () => ({
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  });

  const getProjectEmailSender = () => {
    const configuredAuthDomain = auth?.config?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    return configuredAuthDomain || "your Firebase project domain";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user:", userCredential.user);
      // Redirect to home page (queue booking form) after login
      navigate("/home", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      // Handle different error types
      switch (err.code) {
        case 'auth/user-not-found':
          setError("No account found with this email address.");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password. Please try again.");
          break;
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed login attempts. Please try again later.");
          break;
        default:
          setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed, getResetActionSettings());
      setSuccess(
        `Reset link sent to ${trimmed}. ` +
        `Check your inbox and spam/junk folder. ` +
        `The email comes from noreply@${getProjectEmailSender()}.`
      );
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err) {
      console.error("Password reset error:", err.code, err.message);
      switch (err.code) {
        case "auth/user-not-found":
          setError(
            "No password-based account found for this email. " +
            "If you signed up with Google, use the 'Continue with Google' button instead."
          );
          break;
        case "auth/invalid-credential":
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please wait a few minutes before trying again.");
          break;
        case "auth/missing-email":
          setError("Please enter your email address.");
          break;
        case "auth/missing-continue-uri":
        case "auth/invalid-continue-uri":
        case "auth/unauthorized-continue-uri":
          setError("Password reset is not configured correctly. Check Firebase authorized domains and authDomain settings.");
          break;
        default:
          setError(`Failed to send reset email (${err.code}). Please try again.`);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const redirectResult = await getRedirectResult(auth);
      if (redirectResult?.user) {
        navigate("/home", { replace: true });
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google sign-in successful:", result.user);
      navigate("/home", { replace: true });
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError("Google sign-in failed. Please try again.");
          return;
        }
      }
      switch (err.code) {
        case "auth/popup-closed-by-user":
          setError("Google sign-in was cancelled.");
          break;
        case "auth/operation-not-allowed":
          setError("Google sign-in is not enabled. Contact support.");
          break;
        default:
          setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="login-page">
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
      <main className="login-main">
        <div className="login-container">
          <div className="login-header">
            <h2>Patient Portal Login</h2>
            <p>Access your health records and appointments</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
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
                placeholder="Enter your password"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {showForgotPassword && (
              <div className="forgot-password-panel" style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '16px', marginBottom: 12 }}>
                <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#1e40af' }}>Reset your password</p>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#4b5563' }}>Enter your account email and we'll send a reset link.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Your account email"
                    required
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', outline: 'none', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}
                  >
                    {resetLoading ? 'Sending…' : 'Send Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setError(''); }}
                    style={{ padding: '8px 10px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1L13 4H7L10 1Z" fill="currentColor"/>
                <rect x="2" y="4" width="16" height="14" rx="1" fill="currentColor"/>
              </svg>
              {loading ? "Signing In..." : "Sign In to Portal"}
            </button>

            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(v => !v);
                  setResetEmail((prev) => prev || email);
                  setError('');
                  setSuccess('');
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}
              >
                Forgot password?
              </button>
            </div>

            <div className="divider" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <span style={{ color: '#9ca3af', fontSize: 13 }}>or</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="google-signin-button"
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account?{" "}
              <Link to="/register" className="register-link">
                Register here
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

export default Login;
