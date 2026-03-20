import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../App.css';

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading');
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const normalizedEmail = user.email?.trim().toLowerCase();
        const adminDocIds = [user.uid, normalizedEmail].filter(Boolean);

        let hasAdminAccess = false;
        for (const adminDocId of adminDocIds) {
          const adminDoc = await getDoc(doc(db, 'admins', adminDocId));
          if (adminDoc.exists() && adminDoc.data()?.isAdmin === true) {
            hasAdminAccess = true;
            break;
          }
        }

        setStatus(hasAdminAccess ? 'admin' : 'denied');
      } catch (err) {
        console.error('Admin role check failed:', err);
        setStatus('denied');
      }
    });

    return () => unsub();
  }, []);

  if (status === 'loading') {
    return (
      <div className="admin-guard-screen">
        <div className="admin-guard-spinner" />
        <p className="admin-guard-text">Verifying admin access...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin-login" replace state={{ from: location.pathname }} />;
  }

  if (status === 'denied') {
    return <Navigate to="/admin-login" replace state={{ adminDenied: true }} />;
  }

  return children;
}
