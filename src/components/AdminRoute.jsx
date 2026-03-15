import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'admin' | 'denied' | 'unauthenticated'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists() && adminDoc.data()?.isAdmin === true) {
          setStatus('admin');
        } else {
          setStatus('denied');
        }
      } catch (err) {
        console.error('Admin role check failed:', err);
        setStatus('denied');
      }
    });

    return () => unsub();
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', gap: 12,
        background: '#f8fafc'
      }}>
        <div style={{
          width: 44, height: 44, border: '4px solid #e2e8f0',
          borderTop: '4px solid #2563eb', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#64748b', fontSize: 15 }}>Verifying admin access…</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'denied') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', gap: 16,
        background: '#f8fafc', textAlign: 'center', padding: 24
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: 22 }}>Access Denied</h2>
        <p style={{ color: '#64748b', maxWidth: 360, margin: 0 }}>
          You do not have admin privileges to view this page.
          If you believe this is a mistake, contact your system administrator.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: 8, padding: '10px 24px', background: '#2563eb',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer', fontSize: 14, fontWeight: 600
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return children;
}
