# API Overview – Smart Complaint Tracker React

## Base URL

`http://localhost:5001/api`

All REST endpoints in this document are relative to that base URL.

## Authentication Model

Protected endpoints require a JWT in the `Authorization` header.

Header format:

```http
Authorization: Bearer <JWT_TOKEN>
```

JWTs are issued by the login endpoint and validated by backend middleware.

## Roles Used By The API

The current backend accepts these roles:

- `student`
- `staff`
- `admin`

## 1. Authentication Endpoints

### 1.1 Sign Up

**POST** `/auth/signup`

Creates a new user account.

Request body:

```json
{
  "name": "Student Demo",
  "email": "student@test.com",
  "password": "123456",
  "role": "user",
  "userId": "STD001",
  "location": "Block A"
}
```

Required fields:

- `name`
- `email`
- `password`
- `role`
- `userId`

Behavior:

- email is normalized to lowercase
- `userId` is normalized to uppercase
- password must be at least 6 characters
- email and `userId` must both be unique
- password is hashed with `bcryptjs`

Successful response:

```json
{
  "message": "Signup successful",
  "user": {
    "id": "665000000000000000000001",
    "name": "Student Demo",
    "email": "student@test.com",
    "role": "user",
    "userId": "STD001",
    "location": "Block A"
  }
}
```

Possible errors:

- `400` missing required fields
- `400` password too short
- `400` duplicate email
- `400` duplicate user ID
- `500` signup failed

### 1.2 Login

**POST** `/auth/login`

Authenticates a user by email, user ID, and password.

Request body:

```json
{
  "email": "student@test.com",
  "userId": "STD001",
  "password": "123456"
}
```

Behavior:

- email is matched case-insensitively
- `userId` is normalized to uppercase
- email and user ID must belong to the same account

Successful response:

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN",
  "user": {
    "id": "665000000000000000000001",
    "name": "Student Demo",
    "email": "student@test.com",
    "role": "user",
    "userId": "STD001",
    "location": "Block A"
  }
}
```

Possible errors:

- `400` missing email, ID, or password
- `401` invalid credentials
- `401` invalid password
- `500` login failed

### 1.3 Reset Password

**PUT** `/auth/reset-password`

Resets a password using email and user ID.

Request body:

```json
{
  "email": "student@test.com",
  "userId": "STD001",
  "newPassword": "newpass123"
}
```

Behavior:

- user must exist with matching email and ID
- new password must be at least 6 characters
- password is re-hashed before saving

Successful response:

```json
{
  "message": "Password reset successful. Please login with your new password."
}
```

Possible errors:

- `400` missing required fields
- `400` password too short
- `404` matching user not found
- `500` reset failed

## 2. User Endpoint

### 2.1 Get Staff List

**GET** `/users/staff`

Returns all staff users.

Access:

- admin only

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Successful response:

```json
[
  {
    "_id": "665000000000000000000010",
    "name": "Staff Member",
    "email": "staff@test.com",
    "role": "staff",
    "userId": "STF001",
    "location": "Block B"
  }
]
```

Possible errors:

- `401` token missing or invalid
- `403` access denied
- `500` failed to load staff

## 3. Complaint Endpoints

### 3.1 Get Complaints

**GET** `/complaints`

Returns complaint data filtered by the authenticated user role.

Access:

- `admin`: all complaints
- `staff`: only complaints assigned to that staff member
- `user` or `student`: only complaints created by that user

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Successful response:

```json
[
  {
    "id": "665000000000000000000100",
    "title": "Wifi not working",
    "description": "Internet down since yesterday",
    "category": "Internet",
    "priority": "High",
    "location": "Building/Block: C, Floor: 3, Room No/Lab No: 302",
    "status": "In Progress",
    "targetDate": "2026-05-10T00:00:00.000Z",
    "createdAt": "2026-05-03T10:00:00.000Z",
    "updatedAt": "2026-05-03T11:00:00.000Z",
    "createdBy": "665000000000000000000001",
    "createdByName": "Student Demo",
    "createdById": "STD001",
    "createdByEmail": "student@test.com",
    "createdByLocation": "Block A",
    "assignedTo": "665000000000000000000010",
    "assignedStaffName": "Staff Member",
    "assignedStaffId": "STF001"
  }
]
```

Possible errors:

- `401` token missing or invalid
- `500` failed to load complaints

### 3.2 Create Complaint

**POST** `/complaints`

Creates a complaint and automatically generates an admin notification.

Access:

- `user`
- `student`

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Request body:

```json
{
  "title": "Wifi not working",
  "description": "Internet down since yesterday",
  "category": "Internet",
  "priority": "High",
  "location": "Building/Block: C, Floor: 3, Room No/Lab No: 302"
}
```

Behavior:

- `title`, `description`, `category`, and `location` are required
- if `priority` is not supplied, the backend derives it from complaint text and category
- created complaints always start with status `Open`
- a `NEW_REQUEST` notification is created for admins
- backend emits `complaintsUpdated` and `notificationsUpdated`

Successful response:

```json
{
  "message": "Complaint created successfully",
  "complaint": {
    "_id": "665000000000000000000100",
    "title": "Wifi not working",
    "description": "Internet down since yesterday",
    "category": "Internet",
    "priority": "High",
    "location": "Building/Block: C, Floor: 3, Room No/Lab No: 302",
    "status": "Open",
    "targetDate": null,
    "createdBy": "665000000000000000000001"
  }
}
```

Possible errors:

- `400` missing required fields
- `401` token missing or invalid
- `403` access denied
- `500` failed to create complaint

### 3.3 Assign Complaint

**PUT** `/complaints/:id/assign`

Assigns a complaint to a staff member and sets a target date.

Access:

- admin only

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Request body:

```json
{
  "staffId": "665000000000000000000010",
  "targetDate": "2026-05-10"
}
```

Behavior:

- `staffId` is required
- `targetDate` is required
- selected user must exist and have role `staff`
- complaint status is changed to `In Progress`
- a `STAFF_ASSIGNED` notification is created for the assigned staff member
- backend emits `complaintsUpdated` and `notificationsUpdated`

Successful response:

```json
{
  "message": "Complaint assigned successfully",
  "complaint": {
    "_id": "665000000000000000000100",
    "assignedTo": "665000000000000000000010",
    "targetDate": "2026-05-10T00:00:00.000Z",
    "status": "In Progress"
  }
}
```

Possible errors:

- `400` missing staff ID
- `400` missing target date
- `401` token missing or invalid
- `403` access denied
- `404` staff not found
- `404` complaint not found
- `500` failed to assign complaint

### 3.4 Update Target Date

**PUT** `/complaints/:id/target-date`

Updates the target date for a complaint.

Access:

- admin only

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Request body:

```json
{
  "targetDate": "2026-05-15"
}
```

Behavior:

- `targetDate` is required
- if the complaint is already assigned, a `STAFF_ASSIGNED` notification is created for the assigned staff member with the revised date
- backend emits `complaintsUpdated` and `notificationsUpdated`

Successful response:

```json
{
  "message": "Target date updated successfully",
  "complaint": {
    "_id": "665000000000000000000100",
    "targetDate": "2026-05-15T00:00:00.000Z"
  }
}
```

Possible errors:

- `400` missing target date
- `401` token missing or invalid
- `403` access denied
- `404` complaint not found
- `500` failed to update target date

### 3.5 Update Complaint Status

**PUT** `/complaints/:id/status`

Updates complaint status.

Allowed status values:

- `Open`
- `In Progress`
- `Resolved`

Access rules:

- `staff` can update only complaints assigned to them
- `admin` can update any complaint
- `user` and `student` cannot update complaint status through the current API

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Request body:

```json
{
  "status": "Resolved"
}
```

Behavior:

- if staff resolves a complaint, the backend creates:
  - an admin notification of type `STAFF_RESOLVED`
  - a user notification of type `STAFF_RESOLVED`
- if admin resolves a complaint, the backend creates a user notification of type `STAFF_RESOLVED`
- backend emits `complaintsUpdated`
- backend emits `notificationsUpdated` when new notifications are created

Successful response:

```json
{
  "message": "Status updated successfully",
  "complaint": {
    "_id": "665000000000000000000100",
    "status": "Resolved"
  }
}
```

Possible errors:

- `400` invalid status
- `401` token missing or invalid
- `403` staff updating unassigned complaint
- `403` user/student not allowed
- `404` complaint not found
- `500` failed to update status

### 3.6 Delete Complaint

**DELETE** `/complaints/:id`

Deletes a complaint.

Access:

- admin only

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Behavior:

- complaint is permanently removed
- backend emits `complaintsUpdated`

Successful response:

```json
{
  "message": "Complaint deleted successfully"
}
```

Possible errors:

- `401` token missing or invalid
- `403` access denied
- `404` complaint not found
- `500` failed to delete complaint

## 4. Notification Endpoints

### 4.1 Get Notifications

**GET** `/notifications`

Returns notifications for the authenticated user.

Access:

- `admin`: all notifications where `recipientRole` is `admin`
- `staff`: notifications where `recipientRole` is `staff` and `recipientUser` matches the logged-in staff user
- `user` or `student`: notifications where `recipientRole` is `user` and `recipientUser` matches the logged-in user

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Successful response:

```json
[
  {
    "id": "665000000000000000000200",
    "type": "STAFF_ASSIGNED",
    "message": "You have been assigned complaint \"Wifi not working\". Target resolve date: 5/10/2026.",
    "isRead": false,
    "createdAt": "2026-05-03T11:00:00.000Z",
    "createdByName": "Admin User",
    "createdById": "ADM001",
    "createdByEmail": "admin@test.com",
    "recipientName": "Staff Member",
    "recipientId": "STF001",
    "complaintTitle": "Wifi not working",
    "complaintStatus": "In Progress",
    "complaintCategory": "Internet",
    "complaintPriority": "High",
    "complaintLocation": "Building/Block: C, Floor: 3, Room No/Lab No: 302",
    "complaintTargetDate": "2026-05-10T00:00:00.000Z"
  }
]
```

Possible errors:

- `401` token missing or invalid
- `403` access denied
- `500` failed to load notifications

### 4.2 Mark Notification As Read

**PUT** `/notifications/:id/read`

Marks a notification as read.

Access:

- `admin` can mark admin-targeted notifications
- `staff`, `user`, and `student` can mark only their own notifications

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Successful response:

```json
{
  "message": "Notification marked as read"
}
```

Behavior:

- backend sets `isRead` to `true`
- backend emits `notificationsUpdated`

Possible errors:

- `401` token missing or invalid
- `403` access denied
- `404` notification not found
- `500` failed to update notification

### 4.3 Delete Notification

**DELETE** `/notifications/:id`

Deletes a notification.

Access:

- `admin` can delete admin-targeted notifications
- `staff`, `user`, and `student` can delete only their own notifications

Headers:

- `Authorization: Bearer <JWT_TOKEN>`

Successful response:

```json
{
  "message": "Notification deleted"
}
```

Behavior:

- backend deletes the notification document
- backend emits `notificationsUpdated`

Possible errors:

- `401` token missing or invalid
- `403` access denied
- `404` notification not found
- `500` failed to delete notification

## 5. Real-Time Events

The backend also exposes Socket.IO on:

`http://localhost:5001`

Current events:

| Event | Trigger |
| --- | --- |
| `complaintsUpdated` | complaint created, assigned, target date updated, status updated, or deleted |
| `notificationsUpdated` | notification created, marked as read, or deleted |

The frontend listens to these events and reloads data through the REST API.

## Access Control Summary

| Role | Complaint Access | Notification Access |
| --- | --- | --- |
| `user` | create, view own | view/read/delete own |
| `student` | create, view own | view/read/delete own |
| `staff` | view assigned, update assigned status | view/read/delete own |
| `admin` | view all, assign, update status, update target date, delete | view admin notifications |

## Common Error Responses

| Status | Typical reason |
| --- | --- |
| `400` | missing required fields or invalid input |
| `401` | missing token or invalid token |
| `403` | authenticated but not allowed for this action |
| `404` | complaint, user, or notification not found |
| `500` | server-side failure |

## Typical Testing Flow

1. Sign up or use a seeded demo user.
2. Log in and copy the JWT token.
3. Create a complaint as `user` or `student`.
4. Log in as `admin` and fetch complaints.
5. Assign the complaint to a `staff` user.
6. Log in as `staff` and update the complaint status.
7. Fetch notifications as admin, staff, and the complaint creator to verify the flow.

## Summary

This API provides JWT-based authentication, role-aware complaint access, staff assignment, notification management, and Socket.IO event hooks for live UI refresh. The current backend is small and direct, but the API surface already covers the main complaint lifecycle end to end.
