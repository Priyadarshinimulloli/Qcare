# Hospital Queue Management System

Real-time hospital queue management web app built with React, Vite, Firebase, and Twilio.

This project helps clinics and hospitals manage patient queues, prioritize cases, notify patients by SMS, and provide health guidance through a tips planner and AI-assisted chat.

## Overview

The application includes:

- Patient registration and login (email/password and Google Sign-In)
- Protected routes for patients and admins
- Real-time queue monitoring and status updates with Firestore listeners
- Priority-based queue sorting (age, urgency, wait-time factors)
- Patient dashboard with queue status and estimated wait information
- Admin dashboard with queue operations and bulk actions
- SMS notifications through Twilio
- Health tips planner with daily progress tracking
- Optional AI health tip chat endpoint integration

## Architecture

- High-level architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Editable diagram: [architecture.drawio](architecture.drawio)

## Tech Stack

- Frontend: React 19, Vite, React Router
- Data/Auth: Firebase Authentication + Cloud Firestore
- Charts/Analytics: Recharts, Chart.js
- Notifications: Twilio REST API
- Optional AI integration: external endpoint via `VITE_AI_ENDPOINT`

## Project Structure

```text
.
|- src/
|  |- components/        # UI and feature components
|  |- pages/             # Route pages
|  |- services/          # External service integrations (Twilio)
|  |- utils/             # Queue priority and health-tip helpers
|  |- functions/         # Cloud Functions sample code
|  |- firebase.js        # Firebase app/auth/firestore initialization
|  |- App.jsx            # Route definitions
|  `- main.jsx           # App bootstrap
|- firestore.rules       # Firestore security rules
|- firebase.json         # Firebase project config
|- FIREBASE_INDEXING.md  # Indexing strategy and notes
|- TWILIO_SMS_GUIDE.md   # SMS integration and troubleshooting
`- GOOGLE_SIGNIN_SETUP.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project
- A Twilio account (only for SMS features)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and update values:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Required variables (frontend):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Optional variables:

```env
# Twilio (needed for SMS notifications)
VITE_TWILIO_ACCOUNT_SID=
VITE_TWILIO_AUTH_TOKEN=
VITE_TWILIO_PHONE_NUMBER=
VITE_TWILIO_MESSAGING_SERVICE_SID=

# Optional AI health chat endpoint (POST { prompt, userId } -> { reply })
VITE_AI_ENDPOINT=
```

### 3. Run the app

```bash
npm run dev
```

Vite default URL:

- http://localhost:5173

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Firebase Setup Checklist

1. Create/select a Firebase project.
2. Enable Authentication providers:
- Email/Password
- Google (optional, if using Google Sign-In)
3. Enable Cloud Firestore.
4. Deploy/update Firestore rules from [firestore.rules](firestore.rules).

For provider details, see:

- [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md)

## Twilio SMS Setup

SMS is used by admin workflows for queue updates and alerts.

Notes:

- Phone numbers should be in E.164 format (example: `+919876543210`)
- You can configure either `VITE_TWILIO_PHONE_NUMBER` or `VITE_TWILIO_MESSAGING_SERVICE_SID`

Detailed guide:

- [TWILIO_SMS_GUIDE.md](TWILIO_SMS_GUIDE.md)

## Firestore Indexing Notes

This project intentionally uses client-side sorting in some views to avoid mandatory composite indexes during initial setup.

For production-scale optimization and index recommendations:

- [FIREBASE_INDEXING.md](FIREBASE_INDEXING.md)

## Key Routes

- `/` - Landing page
- `/login` - Authentication
- `/register` - User registration
- `/home` - Patient intake/home
- `/patient` - Patient dashboard
- `/health-tips` - Health tips and planner
- `/admin` - Admin queue management
- `/analytics` - Queue analytics

## Screenshots

![App screenshot 1](https://github.com/user-attachments/assets/e8b3befa-8cee-4a7c-b2ec-7f30460c625b)
![App screenshot 2](https://github.com/user-attachments/assets/adacc1e1-ca39-499f-ac13-1035e2d773f1)

## Security Notes

- Never commit `.env` files with secrets.
- Keep Firebase API and service credentials out of public screenshots.
- Use strict Firestore rules for authenticated access control.
- Prefer moving sensitive API calls (for example Twilio/OpenAI) to trusted backend functions in production.

## Troubleshooting

- Firestore index errors: see [FIREBASE_INDEXING.md](FIREBASE_INDEXING.md)
- Google Sign-In setup issues: see [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md)
- SMS delivery/format issues: see [TWILIO_SMS_GUIDE.md](TWILIO_SMS_GUIDE.md)

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run lint and build checks
4. Open a pull request with a clear description
