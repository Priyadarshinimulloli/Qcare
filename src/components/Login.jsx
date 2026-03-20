import React, { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { useNavigate, Link, useLocation } from "react-router-dom";

const Login = ({ mode = "patient" }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminMode = mode === "admin";

  const verifyAdminAccess = async (user) => {
    const normalizedEmail = user.email?.trim().toLowerCase();
    const adminDocIds = [user.uid, normalizedEmail].filter(Boolean);

    for (const adminDocId of adminDocIds) {
      const adminDoc = await getDoc(doc(db, "admins", adminDocId));
      if (adminDoc.exists() && adminDoc.data()?.isAdmin === true) {
        return true;
      }
    }

    return false;
  };

  const getPostLoginRoute = () => {
    if (isAdminMode || location.state?.from === "/admin") {
      return "/admin";
    }
    return "/home";
  };

  const validateRoleAndNavigate = async (user) => {
    if (!isAdminMode) {
      navigate(getPostLoginRoute(), { replace: true });
      return;
    }

    const hasAdminAccess = await verifyAdminAccess(user);
    if (hasAdminAccess) {
      navigate("/admin", { replace: true });
      return;
    }

    await signOut(auth);
    setError("This account does not have admin access. Please use Patient Login.");
  };

  const getResetActionSettings = () => ({
    url: `${window.location.origin}${isAdminMode ? "/admin-login" : "/login"}`,
    handleCodeInApp: false,
  });

  const getProjectEmailSender = () => {
    const configuredAuthDomain = auth?.config?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    return configuredAuthDomain || "your Firebase project domain";
  };

  const getGoogleAuthErrorMessage = (error) => {
    const code = error?.code;
    switch (code) {
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email using a different sign-in method.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/popup-blocked":
        return "Browser blocked the Google popup. Allow popups for this site and try again.";
      case "auth/cancelled-popup-request":
        return "Google sign-in popup was interrupted. Please try again.";
      case "auth/operation-not-allowed":
        return "Google sign-in is not enabled in Firebase Authentication. Enable Google provider in Firebase Console.";
      case "auth/operation-not-supported-in-this-environment":
      case "auth/web-storage-unsupported":
        return "This browser environment does not support Firebase popup auth. Try a regular browser window and enable cookies/storage.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized for Google sign-in. Add it in Firebase Authentication authorized domains.";
      case "auth/network-request-failed":
        return "Network error during Google sign-in. Check your internet connection and try again.";
      case "auth/invalid-api-key":
      case "auth/app-not-authorized":
        return "Firebase configuration is invalid for this app. Verify your environment variables and authorized app domain.";
      case "auth/internal-error":
        return "Firebase returned an internal auth error. Check Firebase Console status and OAuth provider setup.";
      default:
        return `Google sign-in failed. ${code ? `(${code})` : "(unknown error)"}`;
    }
  };

  const completeGoogleRedirectIfNeeded = async () => {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await validateRoleAndNavigate(redirectResult.user);
      return true;
    }
    return false;
  };

  useEffect(() => {
    let isMounted = true;

    const finalizeGoogleRedirect = async () => {
      try {
        setLoading(true);
        const completed = await completeGoogleRedirectIfNeeded();
        if (completed && isMounted) {
          setError("");
          setSuccess("Signed in with Google. Redirecting...");
        }
      } catch (err) {
        console.error("Google redirect completion error:", err);
        if (isMounted) {
          setError(getGoogleAuthErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    finalizeGoogleRedirect();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user:", userCredential.user);
      navigate("/home", { replace: true });
      await validateRoleAndNavigate(userCredential.user);
    } catch (err) {
      console.error("Login error:", err);
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
      setSuccess(`Reset link sent to ${trimmed}.`);
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err) {
      setError(`Failed to send reset email. Please try again.`);
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (await completeGoogleRedirectIfNeeded()) {
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google sign-in successful:", result.user);
      await validateRoleAndNavigate(result.user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error("Google redirect sign-in error:", redirectErr);
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

  const loginTitle = isAdminMode ? "Admin Portal Login" : "Patient Portal Login";
  const loginSubtitle = isAdminMode
    ? "Authorized staff only. Sign in to access administrative tools."
    : "Access your health records and appointments";

  const submitLabel = loading ? "Signing In..." : (isAdminMode ? "Sign In as Admin" : "Sign In to Portal");

  return (
    <div className="login-page">
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

      <main className="login-main">
        <div className="login-container">
          <div className="login-header">
            <h2>{loginTitle}</h2>
            <p>{loginSubtitle}</p>
          </div>

          <div className="auth-guidance" role="note" aria-label="Login guidance">
            <p className="auth-guidance-title">Before you continue</p>
            <ul className="auth-guidance-list">
              <li>Use the same email you used during registration.</li>
              <li>Google sign-in is available for faster access.</li>
              <li>Admin portal is restricted to approved staff accounts.</li>
            </ul>
          </div>

          {isAdminMode && location.state?.adminDenied && (
            <div className="error-message" style={{ marginBottom: 12 }}>
              You are signed in but not authorized as admin.
            </div>
          )}
          
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

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing In..." : "Sign In to Portal"}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1L13 4H7L10 1Z" fill="currentColor"/>
                <rect x="2" y="4" width="16" height="14" rx="1" fill="currentColor"/>
              </svg>
              {submitLabel}
            </button>
          </form>

          <div className="login-footer">
            {!isAdminMode && (
              <p>Don't have an account?{" "}
                <Link to="/register" className="register-link">
                  Register here
                </Link>
              </p>
            )}
            {isAdminMode && (
              <p>
                Need patient access?{" "}
                <Link to="/login" className="register-link">
                  Go to Patient Login
                </Link>
              </p>
            )}
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
