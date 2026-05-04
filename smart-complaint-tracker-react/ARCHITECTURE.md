# Architecture – Smart Complaint Tracker React

## Overview

This project uses a client-server full stack architecture with a React frontend, an Express API, MongoDB for persistence, and Socket.IO for live updates.

The implementation is intentionally simple:

- The frontend is currently centered in `frontend/src/index.js`.
- The backend is currently centered in `backend/server.js`.
- Mongoose models, route handlers, auth helpers, and Socket.IO event emission all live in the same backend file.

So the system is logically modular, but physically implemented as a compact monolith.

## Architecture Style

- Presentation layer: React 18 with `react-scripts`
- API layer: Node.js + Express
- Persistence layer: MongoDB via Mongoose
- Real-time layer: Socket.IO
- Communication: Axios for HTTP, Socket.IO client for push updates

## High-Level Architecture

```text
+-----------------------------------------------------------+
|                    React Frontend                         |
|-----------------------------------------------------------|
| Auth screens: login, signup, reset password              |
| Complaint form and complaint list                         |
| Admin assignment and target date controls                 |
| Staff work queue and status updates                       |
| Notification center with read/delete actions              |
+---------------------------+-------------------------------+
                                                                |
                                                                | HTTP (Axios) + JWT
                                                                |
+---------------------------v-------------------------------+
|                  Express + Socket.IO Server               |
|-----------------------------------------------------------|
| Auth routes                                                |
| Complaint routes                                            |
| Notification routes                                         |
| Staff lookup route                                          |
| JWT auth middleware                                          |
| Role-based authorization                                     |
| Socket.IO event broadcast                                    |
+---------------------------+-------------------------------+
                                                                |
                                                                | Mongoose
                                                                |
+---------------------------v-------------------------------+
|                         MongoDB                           |
|-----------------------------------------------------------|
| users collection                                           |
| complaints collection                                      |
| notifications collection                                   |
+-----------------------------------------------------------+
```

## Runtime Components

### Frontend

The frontend is a single-page React application that:

- manages authentication state in memory
- sends authenticated API requests with `Authorization: Bearer <token>`
- renders role-aware complaint and notification views
- listens for `complaintsUpdated` and `notificationsUpdated` Socket.IO events
- refreshes data after important writes and after live events

### Backend

The backend exposes REST endpoints under `/api` and is responsible for:

- signup, login, and password reset
- JWT validation
- role-based access control
- complaint creation, assignment, target-date updates, status updates, and deletion
- notification creation, read state updates, and deletion
- broadcasting Socket.IO events after complaint and notification changes

### Database

MongoDB stores three main document types:

- `User`
- `Complaint`
- `Notification`

The backend uses Mongoose schemas and references to connect complaints with creators, assignees, and related notifications.

## Backend Logical Modules

Although the current code is in one file, the backend behavior falls into four logical modules.

### 1. Authentication Module

Responsibilities:

- register new users
- log users in with email, ID, and password
- reset passwords with email and user ID
- issue JWT tokens valid for 7 days
- hash passwords with `bcryptjs`

Main routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `PUT /api/auth/reset-password`

### 2. Complaint Module

Responsibilities:

- create complaints
- fetch complaints according to role
- assign complaints to staff
- set or update target resolution dates
- update complaint status
- delete complaints

Main routes:

- `GET /api/complaints`
- `POST /api/complaints`
- `PUT /api/complaints/:id/assign`
- `PUT /api/complaints/:id/target-date`
- `PUT /api/complaints/:id/status`
- `DELETE /api/complaints/:id`

### 3. Notification Module

Responsibilities:

- create notifications automatically during complaint lifecycle events
- return role-specific notification lists
- support read and delete actions
- trigger live UI refresh through Socket.IO broadcasts

Main routes:

- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

### 4. User Module

Responsibilities:

- provide the staff directory used by admins during complaint assignment

Main route:

- `GET /api/users/staff`

## Role-Based Behavior

### User or Student

Can:

- register and log in
- create complaints
- view only their own complaints
- view their own notifications

Cannot:

- assign complaints
- delete complaints
- directly update complaint status through the current API

### Staff

Can:

- log in
- view only complaints assigned to them
- update status of assigned complaints
- view, read, and delete their own notifications

Cannot:

- assign complaints
- delete complaints
- update complaints not assigned to them

### Admin

Can:

- view all complaints
- fetch all staff users
- assign complaints to staff
- change target dates
- update complaint status
- delete complaints
- view admin-targeted notifications

## Real-Time Architecture

Socket.IO connects the frontend to the backend server at `http://localhost:5001`.

Events emitted by the backend:

- `complaintsUpdated`: emitted when complaints are created, assigned, updated, or deleted
- `notificationsUpdated`: emitted when notifications are created, marked as read, or deleted

Frontend behavior:

- when `complaintsUpdated` arrives, the UI reloads complaint data
- when `notificationsUpdated` arrives, the UI reloads notifications

This gives the application near real-time synchronization without manual page refresh.

## Data Model View

### User

Key fields:

- `name`
- `email`
- `password`
- `role`
- `userId`

Supported roles in the schema:

- `student`
- `staff`
- `admin`

### Complaint

Key fields:

- `title`
- `description`
- `category`
- `priority`
- `location`
- `status`
- `targetDate`
- `createdBy`
- `assignedTo`

Status values:

- `Open`
- `In Progress`
- `Resolved`

### Notification

Key fields:

- `type`
- `message`
- `complaint`
- `createdBy`
- `recipientUser`
- `recipientRole`
- `isRead`

Notification types in the current implementation:

- `NEW_REQUEST`
- `USER_RESOLVED`
- `STAFF_ASSIGNED`
- `STAFF_RESOLVED`

## Application Flows

### Complaint Creation Flow

```text
User/Student
       -> React form submission
       -> POST /api/complaints
       -> Complaint saved in MongoDB
       -> Admin notification created
       -> Socket.IO emits complaintsUpdated
       -> Socket.IO emits notificationsUpdated
       -> frontend refreshes complaint and notification views
```

### Complaint Assignment Flow

```text
Admin
       -> PUT /api/complaints/:id/assign
       -> complaint assigned to staff and moved to In Progress
       -> target date stored
       -> staff notification created
       -> Socket.IO emits complaintsUpdated and notificationsUpdated
```

### Status Update Flow

```text
Staff/Admin
       -> PUT /api/complaints/:id/status
       -> complaint status updated
       -> if resolved, notification generated for admin and/or complaint creator
       -> Socket.IO emits complaintsUpdated
       -> Socket.IO may emit notificationsUpdated
```

### Notification Interaction Flow

```text
User/Staff/Admin
       -> GET /api/notifications
       -> read own role-scoped notifications
       -> PUT /api/notifications/:id/read or DELETE /api/notifications/:id
       -> backend updates MongoDB
       -> Socket.IO emits notificationsUpdated
```

## Security Architecture

- Passwords are hashed with `bcryptjs` before storage.
- JWT is required for protected routes.
- Authorization uses middleware plus role checks.
- Staff, user, and student notification actions are restricted to their own notifications.
- Staff can update only complaints assigned to them.
- Admin-only actions are protected with explicit role checks.

## Development Deployment View

| Component | Default URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API + Socket.IO | `http://localhost:5001` |
| MongoDB | `mongodb://127.0.0.1:27017/smart_complaint_tracker` |

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, react-scripts |
| Styling | CSS |
| HTTP client | Axios |
| Backend | Node.js, Express |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JSON Web Token |
| Password security | bcryptjs |
| Real-time | Socket.IO |

## Key Design Decisions

### Simple Monolithic Structure

The project keeps frontend and backend logic compact and easy to inspect. This is useful for learning, demos, and small deployments, though larger systems would usually split routes, models, and services into separate files.

### Role-Driven Data Access

The backend filters complaints and notifications by role, which keeps the client simple and centralizes permission logic on the server.

### Push-Based UI Refresh

Socket.IO is used only for event signaling. The client still reloads fresh data through REST after each event, which keeps state management straightforward.

### Flexible Complaint Classification

Complaint category, priority, status, location text, assignment, and target date make it possible to track operational issues without a rigid workflow engine.

## Summary

This system is a React + Express + MongoDB complaint tracker with JWT-based authentication and Socket.IO-assisted live refresh. Its current implementation favors clarity and simplicity: one frontend entry file, one backend server file, a small set of collections, and role-based flows for users, staff, and admins.
