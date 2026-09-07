# 📡 Link3 BTS Monitor — Complete Setup Guide

---

## 🗂️ Project Structure

```
link3-bts-monitor/
├── src/
│   ├── config/
│   │   ├── config.js          ← ⭐ SINGLE FILE TO CHANGE FOR VPS
│   │   ├── firebase.js        ← Firebase init
│   │   └── AuthContext.jsx    ← Auth state management
│   ├── pages/
│   │   ├── LoginPage.jsx      ← Monitor login
│   │   ├── AdminLoginPage.jsx ← Admin login
│   │   ├── DashboardPage.jsx  ← Main BTS table
│   │   └── AdminPage.jsx      ← BTS CRUD management
│   ├── components/
│   │   └── HistoryModal.jsx   ← Router ping history
│   └── utils/
│       ├── api.js             ← All API calls
│       └── formatters.js      ← Time/date helpers
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🔥 STEP 1 — Firebase Setup (A to Z)

### 1.1 Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Enter project name: `link3-bts-monitor`
4. Disable Google Analytics (not needed) → **Create project**
5. Wait for project creation → Click **Continue**

---

### 1.2 Enable Firebase Authentication

1. In your Firebase project sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Click **"Email/Password"**
5. Toggle **Enable** → Click **Save**

---

### 1.3 Create the Two User Accounts

Firebase Auth requires email format, so we map usernames to emails:

| Username | Maps to Email              | Password    |
|----------|---------------------------|-------------|
| Power    | power@link3bts.local      | Link3Power  |
| admin    | admin@link3bts.local      | 1745#       |

**To create them:**
1. In Authentication → **Users** tab → Click **"Add user"**
2. Add first user:
   - Email: `power@link3bts.local`
   - Password: `Link3Power`
   - Click **Add user**
3. Add second user:
   - Email: `admin@link3bts.local`
   - Password: `1745#`
   - Click **Add user**

---

### 1.4 Get Firebase Config Keys

1. In Firebase Console, click the **gear icon ⚙️** → **Project settings**
2. Scroll to **"Your apps"** section
3. Click **"</>"** (Web) icon to add a web app
4. App nickname: `link3-bts-web` → Click **Register app**
5. You will see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "link3-bts-monitor.firebaseapp.com",
  projectId: "link3-bts-monitor",
  storageBucket: "link3-bts-monitor.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

6. Copy all these values.

---

### 1.5 Update src/config/config.js

Open `src/config/config.js` and replace the placeholder values:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXX",         // ← paste your apiKey
  authDomain: "link3-bts-monitor.firebaseapp.com",  // ← your authDomain
  projectId: "link3-bts-monitor",      // ← your projectId
  storageBucket: "link3-bts-monitor.appspot.com",   // ← your storageBucket
  messagingSenderId: "123456789012",   // ← your messagingSenderId
  appId: "1:123456...",                // ← your appId
};
```

---

### 1.6 Set Firebase Authorized Domains

When deploying to VPS, add your domain/IP:

1. Firebase Console → **Authentication** → **Settings** tab
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add your VPS IP or domain: e.g. `192.168.1.50` or `bts.link3.net`
5. Click **Add**

---

## 🛠️ STEP 2 — Install & Run Locally

```bash
# Navigate to project folder
cd link3-bts-monitor

# Install all dependencies
npm install

# Start development server
npm run dev
```

Open browser: **http://localhost:5173**

Your API server must be running on `http://localhost:3000`.

---

## 🌐 STEP 3 — Deploy to VPS

### 3.1 Change API URL (ONE PLACE ONLY)

Open **`src/config/config.js`** — find this line:

```javascript
export const API_BASE_URL = "http://localhost:3000";
```

Change it to your VPS server IP or domain:

```javascript
export const API_BASE_URL = "http://YOUR_VPS_IP:3000";
// OR with domain:
export const API_BASE_URL = "https://api.yourdomain.com";
```

**That's the only change needed.** All API calls across the entire app use this single variable.

---

### 3.2 Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized static files.

---

### 3.3 Serve with Nginx (Recommended)

```bash
# On your VPS
sudo apt install nginx

# Copy dist folder
sudo cp -r dist/* /var/www/html/

# Nginx config
sudo nano /etc/nginx/sites-available/link3-bts
```

Paste:
```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;  # or your domain

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # If your API is on same server:
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/link3-bts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 3.4 Handle CORS on API Server

Make sure your Node.js API server allows requests from your VPS IP/domain. Add to your server:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['http://YOUR_VPS_IP', 'https://yourdomain.com', 'http://localhost:5173']
}));
```

---

## 👤 STEP 4 — Login Credentials

| Role    | Username | Password    | Access                        |
|---------|----------|-------------|-------------------------------|
| Monitor | Power    | Link3Power  | View dashboard, ping history  |
| Admin   | admin    | 1745#       | Add/Edit/Delete BTS routers   |

---

## 📋 API Reference

All endpoints use the base URL set in `config.js`:

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | /api/routers                          | Get all routers          |
| POST   | /api/routers                          | Add new router           |
| GET    | /api/routers/:ip                      | Get specific router      |
| PUT    | /api/routers/:ip                      | Update router            |
| DELETE | /api/routers/:ip                      | Delete router + history  |
| GET    | /api/routers/:ip/history              | Get paginated history    |
| GET    | /api/routers/:ip/history?page=2&limit=500 | Custom pagination    |

---

## ✨ Features Summary

- 🔐 **Firebase Auth** — Secure login for monitor + admin roles
- 📊 **Auto-refresh** — Data refreshes every 30 seconds with countdown
- 🔴 **Sorted table** — Highest downtime first, then lowest uptime
- 🔍 **Live search** — Filter by BTS name or IP address
- 📄 **Pagination** — 20 rows per page with navigation
- ⏱️ **BD Time** — All timestamps in GMT+6 (Asia/Dhaka)
- 📅 **History modal** — Full paginated ping history per router
- ⚙️ **Admin panel** — Add, Update, Delete BTS routers
- 🌐 **VPS-ready** — One config change deploys everywhere

---

## 🆘 Troubleshooting

**Login fails with Firebase error:**
- Check `firebaseConfig` values in `config.js`
- Make sure both users are created in Firebase Auth console
- Check that your domain is in Firebase Authorized Domains

**API returns CORS error:**
- Add your frontend URL to the API server's CORS whitelist
- Make sure `API_BASE_URL` in `config.js` matches your backend

**"auth/invalid-credential" error:**
- Verify user emails/passwords in Firebase Auth → Users tab
- Passwords are case-sensitive: `Link3Power` not `link3power`

**No data showing:**
- Check browser console for network errors
- Verify your API server is running on the configured port
- Check `API_BASE_URL` in `config.js` is correct
