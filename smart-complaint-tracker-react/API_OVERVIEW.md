# 📡 API Overview – Smart Complaint & Issue Tracking System

## 📌 Base URL
http://localhost:5001/api

---

## 🔐 Authentication

All protected APIs require JWT token.

### Header Format:
Authorization: Bearer <JWT_TOKEN>

---

# 🧑‍💻 1. AUTHENTICATION APIs

## 1.1 Register User
**POST** `/auth/signup`

### Description:
Registers a new user (student, staff, admin).

### Request Body:
```json
{
  "name": "Student Demo",
  "email": "student@test.com",
  "password": "123456",
  "role": "user",
  "userId": "STD001"
}
Response:
{
  "message": "Signup successful",
  "user": {
    "_id": "user_id",
    "name": "Student Demo",
    "email": "student@test.com",
    "role": "user"
  }
}
1.2 Login

POST /auth/login

Description:

Authenticates user and returns JWT token.

Request Body:
{
  "email": "student@test.com",
  "userId": "STD001",
  "password": "123456"
}
Response:
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "user_id",
    "name": "Student Demo",
    "role": "user"
  }
}
1.3 Reset Password

PUT /auth/reset-password

Description:

Allows user to reset password using email and ID.

Request Body:
{
  "email": "student@test.com",
  "userId": "STD001",
  "newPassword": "123456"
}
Response:
{
  "message": "Password updated successfully"
}
📦 2. COMPLAINT APIs
2.1 Get Complaints

GET /complaints

Description:

Fetch complaints based on user role.

Access:
User → Own complaints
Staff → Assigned complaints
Admin → All complaints
2.2 Create Complaint

POST /complaints

Description:

Creates a new complaint.

Request Body:
{
  "title": "Wifi not working",
  "description": "Internet down since yesterday",
  "category": "Internet",
  "priority": "High",
  "location": "Building: 3, Floor: 5, Room: 502"
}
Response:
{
  "message": "Complaint created successfully"
}
2.3 Assign Complaint (Admin)

PUT /complaints/{id}/assign

Description:

Assign complaint to staff and set target date.

Request Body:
{
  "staffId": "STAFF_OBJECT_ID",
  "targetDate": "2026-05-10"
}
2.4 Update Target Date

PUT /complaints/{id}/target-date

Description:

Update expected resolution date.

Request Body:
{
  "targetDate": "2026-05-15"
}
2.5 Update Complaint Status

PUT /complaints/{id}/status

Description:

Update complaint status.

Request Body:
{
  "status": "Resolved"
}
Allowed:
User → Resolved
Staff/Admin → Open, In Progress, Resolved
2.6 Delete Complaint (Admin)

DELETE /complaints/{id}

Description:

Deletes a complaint.

👨‍🔧 3. USER APIs
3.1 Get Staff List

GET /users/staff

Description:

Returns all staff users.

Access:

Admin only

🔔 4. NOTIFICATION APIs
4.1 Get Notifications

GET /notifications

Description:

Fetch notifications based on role.

Access:
Admin → NEW_REQUEST, USER_RESOLVED
Staff → STAFF_ASSIGNED
4.2 Mark Notification as Read

PUT /notifications/{id}/read

Description:

Marks notification as read.

4.3 Delete Notification

DELETE /notifications/{id}

Description:

Deletes notification.

🔁 5. REAL-TIME EVENTS (Socket.IO)

The system uses real-time communication.

Events:
Event	Description
complaintsUpdated	Triggered when complaint is created/updated
notificationsUpdated	Triggered when notifications change
🔐 ACCESS CONTROL SUMMARY
Role	Permissions
User	Create complaint, view own, mark resolved
Staff	View assigned, update status
Admin	View all, assign, delete, manage notifications
🧪 TESTING FLOW (POSTMAN)
Register user
Login → copy token
Create complaint
Login as admin
Assign complaint
Check staff notifications
Update status
Check admin notifications
⚠️ COMMON ERRORS
Error	Reason
401 Unauthorized	Token missing
Invalid token	Expired or wrong token
403 Forbidden	Role not allowed
400 Bad Request	Missing fields
✅ SUMMARY

This API system supports:

Authentication (Signup, Login, Reset)
Complaint lifecycle management
Role-based access control
Notification system
Real-time updates using Socket.IO