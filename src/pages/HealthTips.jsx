import React from 'react';
import HealthTipPlanner from '../components/HealthTipPlanner';
import AIHealthChat from '../components/AIHealthChat';
import { auth } from '../firebase';

export default function HealthTips() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Health Tips</h1>
      <p style={{ color: '#6b7280' }}>Daily habits and tips to help you stay well while you wait.</p>
      <div style={{ marginTop: 12 }}>
        <HealthTipPlanner userId={auth?.currentUser?.uid || null} />
        <div style={{ marginTop: 18 }}>
          <AIHealthChat userId={auth?.currentUser?.uid || null} />
        </div>
      </div>
    </div>
  );
}
