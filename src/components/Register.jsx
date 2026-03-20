import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
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

  const getEmailRegistrationErrorMessage = (code) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please use a different email or try logging in.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password is too weak. Please choose a stronger password.";
      case "auth/operation-not-allowed":
        return "Email/Password sign-in is disabled in Firebase. Enable it in Authentication > Sign-in method.";
      case "auth/network-request-failed":
        return "Network error while creating account. Check your internet and try again.";
      case "auth/too-many-requests":
        return "Too many attempts from this device. Please wait and try again.";
      case "auth/invalid-api-key":
        return "Firebase API key is invalid. Check your VITE_FIREBASE_API_KEY in .env.";
      default:
        return "Registration failed. Please try again.";
    }
  };

  const getGoogleAuthErrorMessage = (error) => {
    const code = error?.code;
    switch (code) {
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email. Please sign in using your existing method.";
      case "auth/popup-closed-by-user":
        return "Google sign-up was cancelled. Please try again.";
      case "auth/popup-blocked":
        return "Browser blocked the Google popup. Allow popups for this site and try again.";
      case "auth/cancelled-popup-request":
        return "Google sign-up popup was interrupted. Please try again.";
      case "auth/operation-not-allowed":
        return "Google sign-in is not enabled in Firebase Authentication. Enable Google provider in Firebase Console.";
      case "auth/operation-not-supported-in-this-environment":
      case "auth/web-storage-unsupported":
        return "This browser environment does not support Firebase popup auth. Try a regular browser window and enable cookies/storage.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized for Google sign-in. Add it in Firebase Authentication authorized domains.";
      case "auth/network-request-failed":
        return "Network error during Google sign-up. Check your internet and try again.";
      case "auth/internal-error":
        return "Firebase returned an internal auth error. Check Firebase Console status and OAuth provider setup.";
      default:
        return `Google sign-up failed. ${code ? `(${code})` : "(unknown error)"}`;
    }
  };

  const completeGoogleRedirectIfNeeded = async () => {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      setSuccess("Account created successfully with Google! Redirecting to patient portal...");
      setTimeout(() => {
        navigate("/patient", { replace: true });
      }, 1200);
      return true;
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const finalizeGoogleRedirect = async () => {
      try {
        setLoading(true);
        const completed = await completeGoogleRedirectIfNeeded();
        if (!completed || !mounted) return;
      } catch (err) {
        if (mounted) {
          console.error("Google redirect completion error:", err);
          setError(getGoogleAuthErrorMessage(err));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    finalizeGoogleRedirect();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const normalizedEmail = email.trim();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    // Validate required fields
    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !confirmPassword) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      console.log("Registered user:", userCredential.user);
      setSuccess("Registration successful! Redirecting to patient portal...");
      // Redirect to patient dashboard after successful registration
      setTimeout(() => {
        navigate("/patient", { replace: true });
      }, 1200);
    } catch (err) {
      console.error("Registration error:", err);
      const details = err?.code ? ` (${err.code})` : "";
      setError(`${getEmailRegistrationErrorMessage(err?.code)}${details}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      if (await completeGoogleRedirectIfNeeded()) {
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google sign-up successful:", result.user);
      setSuccess("Account created successfully with Google! Redirecting to patient portal...");
      // Redirect to patient dashboard after Google sign-up
      setTimeout(() => {
        navigate("/patient", { replace: true });
      }, 1200);
    } catch (err) {
      console.error("Google sign-up error:", err);
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error("Google redirect sign-up error:", redirectErr);
          setError(getGoogleAuthErrorMessage(redirectErr));
          return;
        }
      }

      setError(getGoogleAuthErrorMessage(err));
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
            
            <div className="divider">
              <span>or</span>
            </div>
            
            <button 
              type="button" 
              onClick={handleGoogleSignUp} 
              className="google-signin-button"
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Creating Account..." : "Continue with Google"}
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