import React, { useEffect, useState } from 'react';
import HealthTipPlanner from '../components/HealthTipPlanner';
import AIHealthChat from '../components/AIHealthChat';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function HealthTips() {
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  if (!authReady) {
    return <div style={{ padding: 24, color: '#6b7280' }}>Loading…</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Health Tips</h1>
      <p style={{ color: '#6b7280' }}>Daily habits and tips to help you stay well while you wait.</p>
      <div style={{ marginTop: 12 }}>
        <HealthTipPlanner userId={userId} />
        <div style={{ marginTop: 18 }}>
          <AIHealthChat userId={userId} />
        </div>
      </div>
    </div>
  );
}
