import React from 'react';

export default function AdminRoute({ children }) {
  // Bypassing all admin checks as requested for direct access
  return children;
}
