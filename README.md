# Hospital Queue Management System

A modern, responsive hospital management system built with React and Firebase.

## Features

- 🏥 **Professional Landing Page**: Clean, medical-themed design
- 👥 **Patient Portal**: Secure login for patients
- 🔐 **Firebase Authentication**: Secure user management
- 📱 **Responsive Design**: Works on desktop and mobile
- ♿ **Accessibility**: WCAG compliant design

## Tech Stack

- **Frontend**: React 19, Vite
- **Routing**: React Router DOM
- **Authentication**: Firebase Auth
- **Styling**: Custom CSS with CSS Variables
- **Icons**: Custom SVG icons

## Setup Instructions

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd hospital-queue
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 4. Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password
3. Copy your Firebase config to the `.env` file

### 5. Run the development server
```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── LandingPage.jsx    # Main landing page
│   ├── Login.jsx          # Patient login
│   ├── Register.jsx       # Patient registration
│   └── Home.jsx           # Patient dashboard
├── firebase.js            # Firebase configuration
├── App.jsx               # Main app with routing
├── App.css              # Component styles
├── index.css            # Global styles
└── main.jsx             # App entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Security Note

Never commit your `.env` file to version control. It contains sensitive Firebase configuration data.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
