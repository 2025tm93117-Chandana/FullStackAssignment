🗄 Database Schema – Smart Complaint & Issue Tracking System

## 📌 Database
MongoDB  
ODM: Mongoose  

---

# 👤 User Collection

## Schema
```js
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, bcrypt-hashed),
  role: String (enum: ['user', 'student', 'staff', 'admin'], required),
  userId: String (required, unique),
  location: String (optional),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
Indexes
email (unique) → fast login lookup
userId (unique) → ensures unique ID per user
role → quick filtering (admin/staff/student)
Example Document
{
  "_id": "65e1a2b3c4d5e6f7g8h9i0a1",
  "name": "Student User",
  "email": "student@test.com",
  "password": "$2b$10$...",
  "role": "student",
  "userId": "STD001",
  "location": "Block A",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
📦 Complaint Collection
Schema
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  category: String (enum: ['Electrical', 'Plumbing', 'Internet', 'Cleaning', 'Furniture', 'Security']),
  priority: String (enum: ['Low', 'Medium', 'High']),
  location: String (required),
  status: String (enum: ['Open', 'In Progress', 'Resolved'], default: 'Open'),
  targetDate: Date (nullable),
  createdBy: ObjectId (ref: User, required),
  assignedTo: ObjectId (ref: User, nullable),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
Indexes
createdBy → fetch user complaints
assignedTo → fetch staff tasks
status → filter by status
category → filter by category
priority → quick sorting/filtering
Constraints
Only admin can assign complaints
Only assigned staff can update status
Users can mark only their own complaints as resolved
Status Workflow
Open ──assign──> In Progress ──resolve──> Resolved
   │                  │
   │            staff updates
   │
user creates
Example Document
{
  "_id": "65e1a2b3c4d5e6f7g8h9i0c1",
  "title": "Wifi not working",
  "description": "Internet down since yesterday",
  "category": "Internet",
  "priority": "High",
  "location": "Building 3, Floor 5, Room 502",
  "status": "In Progress",
  "targetDate": "2026-05-10",
  "createdBy": "65e1a2b3c4d5e6f7g8h9i0a1",
  "assignedTo": "65e1a2b3c4d5e6f7g8h9i0b2",
  "createdAt": "2026-04-28T10:00:00Z",
  "updatedAt": "2026-04-28T11:00:00Z"
}
🔔 Notification Collection
Schema
{
  _id: ObjectId,
  type: String (enum: ['NEW_REQUEST', 'USER_RESOLVED', 'STAFF_ASSIGNED']),
  message: String (required),
  complaint: ObjectId (ref: Complaint),
  createdBy: ObjectId (ref: User),
  recipientUser: ObjectId (ref: User, nullable),
  recipientRole: String (enum: ['admin', 'staff']),
  isRead: Boolean (default: false),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
Indexes
recipientRole → fetch admin/staff notifications
recipientUser → fetch staff-specific notifications
isRead → filter unread notifications
createdAt → latest notifications first
Notification Types
NEW_REQUEST → triggered when user creates complaint
USER_RESOLVED → triggered when user marks resolved
STAFF_ASSIGNED → triggered when admin assigns complaint
Example Document
{
  "_id": "65e1a2b3c4d5e6f7g8h9i0n1",
  "type": "STAFF_ASSIGNED",
  "message": "You have been assigned complaint 'Wifi not working'",
  "complaint": "65e1a2b3c4d5e6f7g8h9i0c1",
  "createdBy": "65e1a2b3c4d5e6f7g8h9i0admin",
  "recipientUser": "65e1a2b3c4d5e6f7g8h9i0staff",
  "recipientRole": "staff",
  "isRead": false,
  "createdAt": "2026-04-28T11:00:00Z",
  "updatedAt": "2026-04-28T11:00:00Z"
}
🔗 Relationships
User (student/user)
   │
   └─────── Complaint (createdBy)

User (staff)
   │
   └─────── Complaint (assignedTo)

Complaint
   │
   └─────── Notification (many)

User (admin)
   │
   └─────── Creates notifications
🔄 Aggregation Examples
1. Get complaints with user and staff details
db.complaints.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "createdBy",
      foreignField: "_id",
      as: "creator"
    }
  },
  { $unwind: "$creator" },
  {
    $lookup: {
      from: "users",
      localField: "assignedTo",
      foreignField: "_id",
      as: "staff"
    }
  },
  { $unwind: { path: "$staff", preserveNullAndEmptyArrays: true } }
])
2. Get complaints count by status
db.complaints.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
])
3. Get unread notifications for staff
db.notifications.find({
  recipientUser: ObjectId("staff_id"),
  isRead: false
})
⚠️ Validation Rules
Email must be unique
userId must be unique
Password must be hashed
Complaint must have title, description, category, location
Only admin can assign complaints
Staff can update only assigned complaints
User can mark only own complaint as resolved
Notifications are generated automatically
✅ Summary

The database design ensures:

Proper normalization of data
Efficient querying using indexes
Role-based relationships
Scalable complaint tracking system
Real-time notification support