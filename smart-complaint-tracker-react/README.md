# Smart Complaint & Issue Tracking System  
Course: SE ZG503 Full Stack Application Development  
Student: Chandana Sajja | ID: 2025TM93117 | EMAIL: 2025tm93117@wilp.bits-pilani.ac.in 

Full-stack complaint tracking application with a React frontend and Node.js backend with real-time updates and notifications.

---

# 🚀 What this project includes

- JWT-based authentication (login, register, reset password)
- Role-based access (Student/User, Staff, Admin)
- Complaint creation with detailed location input
- Admin complaint management (view, assign, delete)
- Staff complaint handling (view assigned, update status)
- Target resolution date tracking
- Notification system:
  - New complaint → Admin
  - Complaint resolved → Admin and Student
  - Complaint assigned → Staff
- Real-time updates using Socket.IO (no page refresh)
- Role-based dashboards with filters and search


# 🛠 Tech Stack

Frontend: React.js, Axios  
Backend: Node.js, Express.js  
Database: MongoDB, Mongoose  
Authentication: JWT, bcryptjs  
Real-time: Socket.IO  
Dev Tools: Nodemon  

---

# 📁 Project Structure
smart-complaint-tracker-react/  
frontend/ - React app  
backend/ - authorization, handles all the functionalities  
Readme.md  
Architecture.md  
DB_SCHEMA.md  
API_OVERVIEW.md

⚙️ Prerequisites  
Node.js 18+  
npm  
MongoDB (local or cloud)

🔧 Environment Setup
Create a .env file in backend:  
PORT=5001  
MONGO_URI=mongodb://127.0.0.1:27017/smart_complaint_tracker  
JWT_SECRET=secret123 

📦 Install Dependencies  
cd frontend  
npm install  
cd ../backend  
npm install  
▶️ Run the Project  
Start Backend  
cd backend  
npm run dev  

Backend runs at:  
http://localhost:5001  
Start Frontend  
cd frontend  
npm start  

Frontend runs at:  
http://localhost:3000  

🔑 Demo Credentials  
👨‍💼 Admin  
Email: admin@test.com  
ID: ADM001  
Password: 123456  

👨‍🔧 Staff  
Email: staff@test.com  
ID: STF001  
Password: 123456  

👨‍🎓 Student/User  
Email: student@test.com  
ID: STD001  
Password: 123456  

📡 API & Documentation
- API Overview: API_OVERVIEW.md
- Architecture: ARCHITECTURE.md
- Database Schema: DB_SCHEMA.md

🔔 Real-Time Features
Socket.IO is used for live updates:
complaintsUpdated → updates complaint list
notificationsUpdated → updates notifications
📊 Features by Role
Student
- Register/Login
- Raise complaint
- View own complaints
- Mark complaint as resolved

Admin
- View all complaints
- Assign complaints to staff
- Set target resolution date
- Delete complaints
- View notifications

Staff
- View assigned complaints
- Update complaint status
- Receive assignment notifications
