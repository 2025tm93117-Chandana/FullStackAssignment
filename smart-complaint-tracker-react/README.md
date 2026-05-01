# Smart Complaint & Issue Tracking System 

This version uses normal React with `react-scripts`, not Vite.

## Demo Login

- Admin: `admin@test.com` / `123456`
- Staff: `staff@test.com` / `123456`
- Student/User: `student@test.com` / `123456`

## Install

Open terminal in the main project folder:

```bash
npm.cmd run install-all
```

If that gives any issue, install manually:

```bash
cd backend
npm.cmd install
cd ../frontend
npm.cmd install
```

## Run

Open two terminals.

Terminal 1:

```bash
cd smart-complaint-tracker-react/backend
npm.cmd run dev
```

Terminal 2:

```bash
cd smart-complaint-tracker-react/frontend
npm.cmd start
```

Frontend: http://localhost:3000
Backend: http://localhost:5001

## Features

- React frontend using `react-scripts`
- Node.js + Express backend
- Login/signup with roles: user, staff, admin
- Complaint CRUD
- Admin assigns complaints to staff
- Staff updates complaint status
- Search and filters
- Sample data included
- Real-time updates using Socket.IO without refresh
