# Qcare 🏥

![GitHub stars](https://img.shields.io/github/stars/Priyadarshinimulloli/Qcare?style=social) 
![GitHub forks](https://img.shields.io/github/forks/Priyadarshinimulloli/Qcare?style=social) 
![GitHub issues](https://img.shields.io/github/issues/Priyadarshinimulloli/Qcare) 
![License](https://img.shields.io/github/license/Priyadarshinimulloli/Qcare)

**Smart Hospital Queue Management System**  
Streamline hospital queues with **digital registration**, **priority case handling**, and **real-time SMS notifications** for smoother patient flow.  

---

## ✨ Features

- 📝 **Patient Registration:** Easy web-based registration for patients.  
- ⏱️ **Queue Management:** Automatically prioritizes critical cases.  
- 📩 **Real-time Notifications:** Sends SMS alerts to patients and staff.  
- 📊 **Admin Dashboard:** Monitor queues and patient details efficiently.  
- 🔗 **Firebase Integration:** For real-time updates and notifications.  

---

## 💻 Tech Stack

- **Frontend:** HTML, CSS, JavaScript, React.js  
- **Backend:** Firebase (Realtime Database & Authentication)  
- **Notifications:** Twilio / SMS API integration  


---

## 📸 Screenshots
<img width="1888" height="929" alt="image" src="https://github.com/user-attachments/assets/e8b3befa-8cee-4a7c-b2ec-7f30460c625b" />
<img width="581" height="862" alt="image" src="https://github.com/user-attachments/assets/adacc1e1-ca39-499f-ac13-1035e2d773f1" />

 

---

## 🚀 Installation

### 1. Clone the repository:  
```bash
git clone https://github.com/Priyadarshinimulloli/Qcare.git

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

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
## 🔒 Security Notes

- Never commit your `.env` file containing Firebase or API keys.  
- Ensure `.env` is included in `.gitignore`.  
- Configure Firebase database rules to allow only authenticated users to read/write.  
- Do not expose sensitive credentials in screenshots, code snippets, or public repos.

## ⭐ Support

If you find Qcare useful, **give it a star ⭐** and share it with others!

