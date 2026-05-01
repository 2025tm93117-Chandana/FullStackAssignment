 🏗 Architecture – Smart Complaint & Issue Tracking System

## 📌 Architecture Style

The system follows a **Client-Server Full Stack Architecture** with real-time communication.

- Frontend: React.js (UI layer)
- Backend: Node.js + Express.js (API layer)
- Database: MongoDB (data storage)
- Real-time: Socket.IO (live updates)

---

## 📊 High-Level Architecture Diagram

```text
+---------------------------------------------------+
|                 React Frontend                    |
|---------------------------------------------------|
| Login / Register / Reset Password                |
| Student Dashboard                                |
| Admin Dashboard                                  |
| Staff Dashboard                                  |
| Notifications UI                                 |
+----------------------▲----------------------------+
                       |
                       | Axios HTTP Requests
                       |
+----------------------▼----------------------------+
|               Express Backend API                |
|---------------------------------------------------|
| Auth Module                                      |
| Complaint Module                                 |
| Notification Module                              |
| User Module                                      |
+----------------------▲----------------------------+
                       |
                       | Mongoose ODM
                       |
+----------------------▼----------------------------+
|                  MongoDB Database               |
|---------------------------------------------------|
| Users Collection                                |
| Complaints Collection                           |
| Notifications Collection                        |
+---------------------------------------------------+
🔁 Real-Time Architecture (Socket.IO)
React Frontend  <------ Socket.IO ------>  Express Backend
Real-Time Events:
complaintsUpdated → Triggered when complaint is created/updated/deleted
notificationsUpdated → Triggered when notification is created/read/deleted

👉 This ensures:

No page refresh required
Instant UI updates
🧩 Backend Module Design
1. Authentication Module
Handles user registration, login, and password reset
Uses JWT for authentication
Uses bcrypt for password hashing
2. Complaint Module
Create complaint
Assign complaint to staff
Update complaint status
Delete complaint (admin only)
3. Notification Module
Generates notifications:
New complaint → Admin
Complaint resolved → Admin
Complaint assigned → Staff
Supports read/unread tracking
4. User Module
Fetch staff list (admin)
Role-based access control
👥 Role-Based System Flow
👨‍🎓 Student/User Flow
Register/Login
Raise complaint with location details
View own complaints
Mark complaint as resolved
🧑‍💼 Admin Flow
Login
View all complaints
Assign complaints to staff
Set target resolution date
Delete complaints
Receive notifications:
New complaint
Complaint resolved
👨‍🔧 Staff Flow
Login
View assigned complaints
Receive notification when assigned
Update complaint status
🔐 Security Architecture
Passwords are hashed using bcrypt
JWT used for authentication
Protected routes require Authorization header
Role-based authorization implemented

🔄 Data Flow
Complaint Creation Flow
User → Frontend → Backend → MongoDB
                         ↓
                  Notification (Admin)
                         ↓
                 Socket.IO broadcast
                         ↓
                 Admin UI updates

Complaint Assignment Flow
Admin → Backend → Update Complaint
                      ↓
               Create Notification
                      ↓
               Notify Staff (Socket.IO)

Complaint Resolution Flow
User/Staff → Backend → Update Status
                         ↓
                  Notification (Admin)
                         ↓
                 Real-time UI update

📦 Deployment Architecture
Development Environment
Component	URL
Frontend	http://localhost:3000

Backend	http://localhost:5001

Database	mongodb://127.0.0.1:27017

⚙️ Technology Stack
Layer	Technology
Frontend	React.js
Backend	Node.js, Express.js
Database	MongoDB
ORM	Mongoose
Auth	JWT
Security	bcryptjs
Real-time	Socket.IO
API Calls	Axios

📌 Key Design Decisions
Role-Based Access Control
Ensures security and proper permissions
Real-Time Updates
Improves user experience (no refresh)
Modular Backend Structure
Separation of concerns (auth, complaint, notification)
MongoDB Usage
Flexible schema for rapid development
