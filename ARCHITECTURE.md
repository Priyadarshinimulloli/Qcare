# System Architecture

This document describes the high-level architecture of the Hospital Queue Management System.

## Overview

```mermaid
flowchart TB
  subgraph Client["Client Layer (Browser)"]
    U["Patient / Admin User"]
    V["React + Vite SPA"]
    R["React Router\\nProtectedRoute"]
    C["UI Components\\nLanding/Login/Register/Home\\nAdminDashboard/PatientDashboard\\nAnalytics/HealthTips"]
    Svc["Client Services\\npriorityCalculator\\nhealthTipsApi\\ntwilioService"]
    U --> V --> R --> C
    C --> Svc
  end

  subgraph Firebase["Firebase Backend"]
    Auth["Firebase Auth\\nEmail/Password + Google"]
    FS["Cloud Firestore"]
    Rules["Security Rules\\nfirestore.rules"]
  end

  subgraph Collections["Firestore Collections"]
    Q["queues"]
    T["healthTips"]
    H["userHabits"]
    A["appointments"]
    Vitals["vitals"]
    Rx["prescriptions"]
    AdminAct["admin_actions"]
    SmsLog["sms_logs"]
    EB["emergency_broadcasts"]
  end

  subgraph External["External Service"]
    Twilio["Twilio REST API\\nSMS Delivery"]
  end

  V -->|sign-in / session| Auth
  C -->|read/write data| FS
  FS --> Rules
  FS --> Q
  FS --> T
  FS --> H
  FS --> A
  FS --> Vitals
  FS --> Rx
  FS --> AdminAct
  FS --> SmsLog
  FS --> EB

  Svc -->|send notifications| Twilio
  Twilio -. delivery status .-> SmsLog
```

## Notes

- The frontend is a single-page React application served by Vite.
- Firebase Auth protects routes and user sessions.
- Firestore stores queue, health tips, dashboard, and audit data.
- Twilio is used for SMS notifications from dashboard workflows.
