const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_complaint_tracker')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Error:', err.message));

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'student', 'staff', 'admin'], default: 'user' },
    userId: { type: String, required: true, unique: true, trim: true },
    location: { type: String, default: 'Not provided' }
  },
  { timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['Electrical', 'Plumbing', 'Internet', 'Cleaning', 'Furniture', 'Security'],
      required: true
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    location: { type: String, required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    targetDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['NEW_REQUEST', 'USER_RESOLVED', 'STAFF_ASSIGNED'],
      required: true
    },
    message: { type: String, required: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recipientRole: { type: String, enum: ['admin', 'staff'], required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);
const Notification = mongoose.model('Notification', notificationSchema);

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, userId: user.userId, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    userId: user.userId,
    location: user.location
  };
}

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}

function autoPriority(title, description, category) {
  const text = `${title} ${description} ${category}`.toLowerCase();

  if (
    text.includes('fire') ||
    text.includes('shock') ||
    text.includes('no internet') ||
    text.includes('water leak') ||
    text.includes('security') ||
    text.includes('urgent') ||
    text.includes('wifi')
  ) {
    return 'High';
  }

  if (
    text.includes('broken') ||
    text.includes('repair') ||
    text.includes('not working') ||
    text.includes('slow') ||
    text.includes('leak')
  ) {
    return 'Medium';
  }

  return 'Low';
}

/* AUTH */

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, userId, location } = req.body;

    if (!name || !email || !password || !role || !userId) {
      return res.status(400).json({
        message: 'Name, email, password, role and ID are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUserId = userId.trim().toUpperCase();

    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(400).json({
        message: 'This email is already registered. Please login or reset password.'
      });
    }

    const idExists = await User.findOne({ userId: normalizedUserId });
    if (idExists) {
      return res.status(400).json({
        message: 'This ID is already registered. Please use a different ID.'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      role,
      userId: normalizedUserId,
      location: location?.trim() || 'Not provided'
    });

    return res.status(201).json({
      message: 'Signup successful',
      user: formatUser(user)
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Signup failed',
      error: err.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, userId } = req.body;

    if (!email || !password || !userId) {
      return res.status(400).json({
        message: 'Email, ID and password are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      userId: userId.trim().toUpperCase()
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials. Email and ID must match same registered user.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid password'
      });
    }

    return res.json({
      message: 'Login successful',
      token: createToken(user),
      user: formatUser(user)
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Login failed',
      error: err.message
    });
  }
});

app.put('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, userId, newPassword } = req.body;

    if (!email || !userId || !newPassword) {
      return res.status(400).json({
        message: 'Email, ID and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      userId: userId.trim().toUpperCase()
    });

    if (!user) {
      return res.status(404).json({
        message: 'No user found. Please check that email and ID belong to the same registered account.'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      message: 'Password reset successful. Please login with your new password.'
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Password reset failed',
      error: err.message
    });
  }
});

/* USERS */

app.get('/api/users/staff', auth, allowRoles('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password').sort({ name: 1 });
    return res.json(staff);
  } catch {
    return res.status(500).json({ message: 'Failed to load staff' });
  }
});

/* NOTIFICATIONS */

app.get('/api/notifications', auth, allowRoles('admin', 'staff'), async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'admin') {
      query = { recipientRole: 'admin' };
    }

    if (req.user.role === 'staff') {
      query = { recipientRole: 'staff', recipientUser: req.user.id };
    }

    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email userId role')
      .populate('recipientUser', 'name email userId role')
      .populate('complaint', 'title status category priority location targetDate')
      .sort({ createdAt: -1 });

    return res.json(
      notifications.map(n => ({
        id: n._id,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,

        createdByName: n.createdBy?.name || '',
        createdById: n.createdBy?.userId || '',
        createdByEmail: n.createdBy?.email || '',

        recipientName: n.recipientUser?.name || '',
        recipientId: n.recipientUser?.userId || '',

        complaintTitle: n.complaint?.title || '',
        complaintStatus: n.complaint?.status || '',
        complaintCategory: n.complaint?.category || '',
        complaintPriority: n.complaint?.priority || '',
        complaintLocation: n.complaint?.location || '',
        complaintTargetDate: n.complaint?.targetDate || null
      }))
    );
  } catch {
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
});

app.put('/api/notifications/:id/read', auth, allowRoles('admin', 'staff'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (
      req.user.role === 'staff' &&
      notification.recipientUser?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.isRead = true;
    await notification.save();

    io.emit('notificationsUpdated');

    return res.json({ message: 'Notification marked as read' });
  } catch {
    return res.status(500).json({ message: 'Failed to update notification' });
  }
});

app.delete('/api/notifications/:id', auth, allowRoles('admin', 'staff'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (
      req.user.role === 'staff' &&
      notification.recipientUser?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Notification.findByIdAndDelete(req.params.id);

    io.emit('notificationsUpdated');

    return res.json({ message: 'Notification deleted' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
});

/* COMPLAINTS */

app.get('/api/complaints', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'user' || req.user.role === 'student') {
      query.createdBy = req.user.id;
    }

    if (req.user.role === 'staff') {
      query.assignedTo = req.user.id;
    }

    const data = await Complaint.find(query)
      .populate('createdBy', 'name email userId location role')
      .populate('assignedTo', 'name email userId location role')
      .sort({ createdAt: -1 });

    return res.json(
      data.map(c => ({
        id: c._id,
        title: c.title,
        description: c.description,
        category: c.category,
        priority: c.priority,
        location: c.location,
        status: c.status,
        targetDate: c.targetDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,

        createdBy: c.createdBy?._id || '',
        createdByName: c.createdBy?.name || '',
        createdById: c.createdBy?.userId || '',
        createdByEmail: c.createdBy?.email || '',
        createdByLocation: c.createdBy?.location || '',

        assignedTo: c.assignedTo?._id || '',
        assignedStaffName: c.assignedTo?.name || '',
        assignedStaffId: c.assignedTo?.userId || ''
      }))
    );
  } catch {
    return res.status(500).json({ message: 'Failed to load complaints' });
  }
});

app.post('/api/complaints', auth, allowRoles('user', 'student'), async (req, res) => {
  try {
    const { title, description, category, priority, location } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        message: 'Title, description, category and location are required'
      });
    }

    const complaint = await Complaint.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority: priority || autoPriority(title, description, category),
      location: location.trim(),
      status: 'Open',
      createdBy: req.user.id
    });

    const user = await User.findById(req.user.id);

    await Notification.create({
      type: 'NEW_REQUEST',
      message: `${user.name} (${user.userId}) raised a new complaint: "${complaint.title}".`,
      complaint: complaint._id,
      createdBy: user._id,
      recipientRole: 'admin'
    });

    io.emit('complaintsUpdated');
    io.emit('notificationsUpdated');

    return res.status(201).json({
      message: 'Complaint created successfully',
      complaint
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to create complaint',
      error: err.message
    });
  }
});

app.put('/api/complaints/:id/assign', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { staffId, targetDate } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    if (!targetDate) {
      return res.status(400).json({ message: 'Target date is required' });
    }

    const staff = await User.findOne({ _id: staffId, role: 'staff' });

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: staffId,
        targetDate,
        status: 'In Progress'
      },
      { new: true }
    ).populate('createdBy', 'name userId');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    await Notification.create({
      type: 'STAFF_ASSIGNED',
      message: `You have been assigned complaint "${complaint.title}". Target resolve date: ${new Date(targetDate).toLocaleDateString()}.`,
      complaint: complaint._id,
      createdBy: req.user.id,
      recipientUser: staff._id,
      recipientRole: 'staff'
    });

    io.emit('complaintsUpdated');
    io.emit('notificationsUpdated');

    return res.json({
      message: 'Complaint assigned successfully',
      complaint
    });
  } catch {
    return res.status(500).json({ message: 'Failed to assign complaint' });
  }
});

app.put('/api/complaints/:id/target-date', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { targetDate } = req.body;

    if (!targetDate) {
      return res.status(400).json({ message: 'Target date is required' });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { targetDate },
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (complaint.assignedTo) {
      await Notification.create({
        type: 'STAFF_ASSIGNED',
        message: `Target date updated for complaint "${complaint.title}". New target date: ${new Date(targetDate).toLocaleDateString()}.`,
        complaint: complaint._id,
        createdBy: req.user.id,
        recipientUser: complaint.assignedTo,
        recipientRole: 'staff'
      });
    }

    io.emit('complaintsUpdated');
    io.emit('notificationsUpdated');

    return res.json({
      message: 'Target date updated successfully',
      complaint
    });
  } catch {
    return res.status(500).json({ message: 'Failed to update target date' });
  }
});

app.put('/api/complaints/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('createdBy', 'name userId email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (req.user.role === 'staff' && complaint.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Staff can update only assigned complaints' });
    }

    if (
      (req.user.role === 'user' || req.user.role === 'student') &&
      complaint.createdBy?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'You can update only your own complaint' });
    }

    if (req.user.role === 'user' || req.user.role === 'student') {
      if (status !== 'Resolved') {
        return res.status(403).json({ message: 'User can only mark complaint as Resolved' });
      }
    }

    const oldStatus = complaint.status;
    complaint.status = status;
    await complaint.save();

    if (
      (req.user.role === 'user' || req.user.role === 'student') &&
      status === 'Resolved' &&
      oldStatus !== 'Resolved'
    ) {
      await Notification.create({
        type: 'USER_RESOLVED',
        message: `${complaint.createdBy.name} (${complaint.createdBy.userId}) marked complaint "${complaint.title}" as resolved.`,
        complaint: complaint._id,
        createdBy: complaint.createdBy._id,
        recipientRole: 'admin'
      });

      io.emit('notificationsUpdated');
    }

    io.emit('complaintsUpdated');

    return res.json({
      message: 'Status updated successfully',
      complaint
    });
  } catch {
    return res.status(500).json({ message: 'Failed to update status' });
  }
});

app.delete('/api/complaints/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    io.emit('complaintsUpdated');

    return res.json({ message: 'Complaint deleted successfully' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete complaint' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});