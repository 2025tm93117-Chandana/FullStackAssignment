import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { io } from 'socket.io-client';
import './style.css';

const API = 'http://localhost:5001/api';
const socket = io('http://localhost:5001');

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('complaints');

  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staff, setStaff] = useState([]);
  const [message, setMessage] = useState('');

  const [notificationFilter, setNotificationFilter] = useState('All');
  const [notificationSearch, setNotificationSearch] = useState('');

  const [filter, setFilter] = useState({
    status: 'All',
    category: 'All',
    search: ''
  });

  const [auth, setAuth] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: '',
    role: 'user',
    userId: ''
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Electrical',
    priority: '',
    building: '',
    floor: '',
    roomNo: '',
    area: ''
  });

  const [assignData, setAssignData] = useState({});

  const authHeaders = useMemo(() => {
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    setToken('');
    setComplaints([]);
    setNotifications([]);
    setStaff([]);
    setMessage('');
    setAuthMode('login');
    setActiveTab('complaints');
  }, []);

  const generateIdByRole = role => {
    const random = Math.floor(100 + Math.random() * 900);
    if (role === 'admin') return `ADM${random}`;
    if (role === 'staff') return `STF${random}`;
    return `STD${random}`;
  };

  const formatDate = date => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = date => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  const buildComplaintLocation = () => {
    return [
      form.building && `Building/Block: ${form.building}`,
      form.floor && `Floor: ${form.floor}`,
      form.roomNo && `Room No/Lab No: ${form.roomNo}`,
      form.area && `Area/Landmark: ${form.area}`
    ]
      .filter(Boolean)
      .join(', ');
  };

  const loadNotifications = useCallback(async () => {
  if (!token || !user) return;
    try {
      const res = await axios.get(`${API}/notifications`, {
        headers: authHeaders
      });

      setNotifications(res.data);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to load notifications');
    }
  }, [token, user, authHeaders]);

  const loadData = useCallback(async () => {
    if (!token || !user) return;

    try {
      const res = await axios.get(`${API}/complaints`, {
        headers: authHeaders
      });

      setComplaints(res.data);

      if (user.role === 'admin') {
        const staffRes = await axios.get(`${API}/users/staff`, {
          headers: authHeaders
        });
        setStaff(staffRes.data);
      }

        loadNotifications();
      
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load data';
      setMessage(msg);

      if (e.response?.status === 401 || msg.toLowerCase().includes('invalid token')) {
        logout();
      }
    }
  }, [token, user, authHeaders, logout, loadNotifications]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleComplaintsUpdate = () => loadData();
    const handleNotificationsUpdate = () => loadNotifications();

    socket.on('complaintsUpdated', handleComplaintsUpdate);
    socket.on('notificationsUpdated', handleNotificationsUpdate);

    return () => {
      socket.off('complaintsUpdated', handleComplaintsUpdate);
      socket.off('notificationsUpdated', handleNotificationsUpdate);
    };
  }, [loadData, loadNotifications]);

  async function submitAuth(e) {
    e.preventDefault();

    try {
      if (authMode === 'register') {
        if (!auth.name || !auth.email || !auth.password || !auth.role || !auth.userId) {
          setMessage('Please fill all registration fields.');
          return;
        }

        await axios.post(`${API}/auth/signup`, {
          name: auth.name,
          email: auth.email,
          password: auth.password,
          role: auth.role,
          userId: auth.userId.toUpperCase(),
          location: 'Not provided'
        });

        setMessage('Registration successful. Please login now.');
        setAuthMode('login');

        setAuth({
          name: '',
          email: auth.email,
          password: '',
          newPassword: '',
          role: auth.role,
          userId: auth.userId.toUpperCase()
        });

        return;
      }

      if (authMode === 'reset') {
        if (!auth.email || !auth.userId || !auth.newPassword) {
          setMessage('Please enter email, ID and new password.');
          return;
        }

        await axios.put(`${API}/auth/reset-password`, {
          email: auth.email,
          userId: auth.userId.toUpperCase(),
          newPassword: auth.newPassword
        });

        setMessage('Password reset successful. Please login.');
        setAuthMode('login');

        setAuth({
          name: '',
          email: auth.email,
          password: '',
          newPassword: '',
          role: 'user',
          userId: auth.userId.toUpperCase()
        });

        return;
      }

      if (!auth.email || !auth.userId || !auth.password) {
        setMessage('Please enter email, ID and password.');
        return;
      }

      const res = await axios.post(`${API}/auth/login`, {
        email: auth.email,
        userId: auth.userId.toUpperCase(),
        password: auth.password
      });

      setToken(res.data.token);
      setUser(res.data.user);
      setMessage('Login successful');
      setActiveTab('complaints');
    } catch (e) {
      setMessage(e.response?.data?.message || 'Authentication failed');
    }
  }

  async function createComplaint(e) {
    e.preventDefault();

    const location = buildComplaintLocation();

    if (!form.title || !form.description || !form.building || !form.floor || !form.roomNo) {
      setMessage('Please enter title, description, building/block, floor and room number.');
      return;
    }

    try {
      await axios.post(
        `${API}/complaints`,
        {
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          location
        },
        { headers: authHeaders }
      );

      setForm({
        title: '',
        description: '',
        category: 'Electrical',
        priority: '',
        building: '',
        floor: '',
        roomNo: '',
        area: ''
      });

      setMessage('Complaint created successfully');
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to create complaint');
    }
  }

  async function assignComplaint(id) {
    const data = assignData[id];

    if (!data?.staffId || !data?.targetDate) {
      setMessage('Please select staff and target date.');
      return;
    }

    try {
      await axios.put(
        `${API}/complaints/${id}/assign`,
        {
          staffId: data.staffId,
          targetDate: data.targetDate
        },
        { headers: authHeaders }
      );

      setMessage('Complaint assigned with target date');
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to assign complaint');
    }
  }

  async function updateTargetDate(id, targetDate) {
    if (!targetDate) return;

    try {
      await axios.put(
        `${API}/complaints/${id}/target-date`,
        { targetDate },
        { headers: authHeaders }
      );

      setMessage('Target date updated');
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to update target date');
    }
  }

  async function updateStatus(id, status) {
    try {
      await axios.put(
        `${API}/complaints/${id}/status`,
        { status },
        { headers: authHeaders }
      );

      setMessage('Status updated successfully');
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to update status');
    }
  }

  async function markNotificationRead(id) {
    try {
      await axios.put(`${API}/notifications/${id}/read`, {}, { headers: authHeaders });
      setMessage('Notification marked as read');
      await loadNotifications();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  async function deleteNotification(id) {
    try {
      await axios.delete(`${API}/notifications/${id}`, { headers: authHeaders });
      loadNotifications();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to delete notification');
    }
  }

  async function deleteComplaint(id) {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;

    try {
      await axios.delete(`${API}/complaints/${id}`, {
        headers: authHeaders
      });
      setMessage('Complaint deleted successfully');
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to delete complaint');
    }
  }

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const title = c.title || '';
      const location = c.location || '';
      const createdById = c.createdById || '';

      return (
        (filter.status === 'All' || c.status === filter.status) &&
        (filter.category === 'All' || c.category === filter.category) &&
        (
          title.toLowerCase().includes(filter.search.toLowerCase()) ||
          location.toLowerCase().includes(filter.search.toLowerCase()) ||
          createdById.toLowerCase().includes(filter.search.toLowerCase())
        )
      );
    });
  }, [complaints, filter]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter =
        notificationFilter === 'All' ||
        (notificationFilter === 'Unread' && !n.isRead) ||
        (notificationFilter === 'Read' && n.isRead) ||
        n.type === notificationFilter;

      const search = notificationSearch.toLowerCase();

      const matchesSearch =
        (n.message || '').toLowerCase().includes(search) ||
        (n.createdByName || '').toLowerCase().includes(search) ||
        (n.createdById || '').toLowerCase().includes(search) ||
        (n.createdByEmail || '').toLowerCase().includes(search) ||
        (n.complaintTitle || '').toLowerCase().includes(search) ||
        (n.complaintLocation || '').toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, notificationFilter, notificationSearch]);

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'Open').length,
    progress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) {
    return (
      <div className="loginPage">
        <div className="authCard">
          <h1>Smart Complaint Tracker</h1>
          <h2>
            {authMode === 'login'
              ? 'Login'
              : authMode === 'register'
              ? 'Register'
              : 'Reset Password'}
          </h2>

          <form onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <input
                  placeholder="Full Name"
                  value={auth.name}
                  onChange={e => setAuth({ ...auth, name: e.target.value })}
                />

                <select
                  value={auth.role}
                  onChange={e => {
                    const role = e.target.value;
                    setAuth({
                      ...auth,
                      role,
                      userId: generateIdByRole(role)
                    });
                  }}
                >
                  <option value="user">Student / User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>

                <input
                  placeholder={
                    auth.role === 'admin'
                      ? 'Admin ID'
                      : auth.role === 'staff'
                      ? 'Staff ID'
                      : 'Student ID'
                  }
                  value={auth.userId}
                  onChange={e => setAuth({ ...auth, userId: e.target.value.toUpperCase() })}
                />
              </>
            )}

            {(authMode === 'login' || authMode === 'reset') && (
              <>
                <input
                  placeholder="Email"
                  value={auth.email}
                  onChange={e => setAuth({ ...auth, email: e.target.value })}
                />

                <input
                  placeholder="Student ID / Staff ID / Admin ID"
                  value={auth.userId}
                  onChange={e => setAuth({ ...auth, userId: e.target.value.toUpperCase() })}
                />
              </>
            )}

            {authMode === 'register' && (
              <input
                placeholder="Email"
                value={auth.email}
                onChange={e => setAuth({ ...auth, email: e.target.value })}
              />
            )}

            {authMode !== 'reset' && (
              <input
                type="password"
                placeholder="Password"
                value={auth.password}
                onChange={e => setAuth({ ...auth, password: e.target.value })}
              />
            )}

            {authMode === 'reset' && (
              <input
                type="password"
                placeholder="New Password"
                value={auth.newPassword}
                onChange={e => setAuth({ ...auth, newPassword: e.target.value })}
              />
            )}

            <button>
              {authMode === 'login'
                ? 'Login'
                : authMode === 'register'
                ? 'Register'
                : 'Reset Password'}
            </button>
          </form>

          <button
            className="linkBtn"
            onClick={() => {
              setMessage('');
              setAuthMode('register');
              setAuth({
                name: '',
                email: '',
                password: '',
                newPassword: '',
                role: 'user',
                userId: ''
              });
            }}
          >
            New user? Register here
          </button>

          <button
            className="linkBtn"
            onClick={() => {
              setMessage('');
              setAuthMode('reset');
              setAuth({
                name: '',
                email: '',
                password: '',
                newPassword: '',
                role: 'user',
                userId: ''
              });
            }}
          >
            Forgot password? Reset here
          </button>

          {authMode !== 'login' && (
            <button
              className="linkBtn"
              onClick={() => {
                setMessage('');
                setAuthMode('login');
                setAuth({
                  name: '',
                  email: '',
                  password: '',
                  newPassword: '',
                  role: 'user',
                  userId: ''
                });
              }}
            >
              Back to login
            </button>
          )}

          {message && <p className="msg">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav>
        <h2>Smart Complaint Tracker</h2>
        <span>
          {user.name} ({user.role}) | ID: {user.userId}
        </span>
        <button onClick={logout}>Logout</button>
      </nav>

      <main>
        <section className="stats">
          <div><b>{stats.total}</b><span>Total</span></div>
          <div><b>{stats.open}</b><span>Open</span></div>
          <div><b>{stats.progress}</b><span>In Progress</span></div>
          <div><b>{stats.resolved}</b><span>Resolved</span></div>
        </section>

          {(user.role === 'admin' || user.role === 'staff' || user.role === 'user' || user.role === 'student') && (          <div className="adminTabs">
            <button
              className={activeTab === 'complaints' ? 'activeTab' : ''}
              onClick={() => setActiveTab('complaints')}
            >
              Complaints
            </button>

            <button
              className={activeTab === 'notifications' ? 'activeTab' : ''}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications {unreadCount > 0 && <span className="notifyBadge">{unreadCount}</span>}
            </button>
          </div>
        )}

        {message && <p className="msg">{message}</p>}

          {(user.role === 'admin' || user.role === 'staff' || user.role === 'user' || user.role === 'student') && activeTab === 'notifications' && (          <section className="panel">
            <h3>
                {user.role === 'admin'
                  ? 'Admin Notifications'
                  : user.role === 'staff'
                  ? 'Staff Notifications'
                  : 'My Notifications'}{' '}
                <span className="live">● Live</span>
            </h3>

            <div className="filters">
              <select
                value={notificationFilter}
                onChange={e => setNotificationFilter(e.target.value)}
              >
                <option value="All">All Notifications</option>
                <option value="Unread">Unread Only</option>
                <option value="Read">Read Only</option>
                {user.role === 'admin' && <option value="NEW_REQUEST">New Requests</option>}
                {user.role === 'admin' && <option value="USER_RESOLVED">Marked Resolved</option>}
                {user.role === 'staff' && <option value="STAFF_ASSIGNED">Staff Assigned</option>}
                <option value="STAFF_RESOLVED">Staff Resolved</option>
              </select>

              <input
                placeholder="Search notifications by student/title/location"
                value={notificationSearch}
                onChange={e => setNotificationSearch(e.target.value)}
              />
            </div>

            <div className="cards">
              {filteredNotifications.length === 0 && <p>No notifications found.</p>}

              {filteredNotifications.map(n => (
                <div className={`card ${!n.isRead ? 'unreadNotification' : ''}`} key={n.id}>
                  <div className="cardHead">
                    <h4>
                        {n.type === 'NEW_REQUEST'
                          ? 'New Complaint Request'
                          : n.type === 'USER_RESOLVED'
                          ? 'User Marked Resolved'
                          : n.type === 'STAFF_ASSIGNED'
                          ? 'Complaint Assigned'
                          : n.type === 'STAFF_RESOLVED'
                          ? 'Complaint Resolved'
                          : 'Notification'}
                    </h4> 
                    <span className={`badge ${n.isRead ? 'Resolved' : 'Open'}`}>
                      {n.isRead ? 'Read' : 'New'}
                    </span>
                  </div>

                  <p>{n.message}</p>

                  <div className="detailsBox">
                    <b>Complaint:</b> {n.complaintTitle || 'N/A'}
                    <br />
                    <b>Category:</b> {n.complaintCategory || 'N/A'}
                    <br />
                    <b>Priority:</b> {n.complaintPriority || 'N/A'}
                    <br />
                    <b>Status:</b> {n.complaintStatus || 'N/A'}
                    <br />
                    <b>Location:</b> {n.complaintLocation || 'N/A'}
                    <br />
                    <b>Target Date:</b> {formatDate(n.complaintTargetDate)}
                    <br />
                    <b>Created By:</b> {n.createdByName || 'N/A'} ({n.createdById || 'N/A'})
                    <br />
                    <b>Email:</b> {n.createdByEmail || 'N/A'}
                    <br />
                    <b>Time:</b> {formatDateTime(n.createdAt)}
                  </div>

                  <div className="actions">
                    {!n.isRead && (
                      <button className="primaryActionBtn" onClick={() => markNotificationRead(n.id)}>
                        Mark as Read
                      </button>
                    )}

                    <button className="danger" onClick={() => deleteNotification(n.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'complaints' && (
          <>
            {(user.role === 'user' || user.role === 'student') && (
              <section className="panel">
                <h3>Raise Complaint</h3>

                <div className="profileBox">
                  <b>Student Details:</b>
                  <br />
                  Name: {user.name}
                  <br />
                  Student ID: {user.userId}
                </div>

                <form className="gridForm" onSubmit={createComplaint}>
                  <input
                    placeholder="Title"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />

                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {['Electrical', 'Plumbing', 'Internet', 'Cleaning', 'Furniture', 'Security'].map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>

                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="">Auto Priority</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>

                  <input
                    placeholder="Building / Block No"
                    value={form.building}
                    onChange={e => setForm({ ...form, building: e.target.value })}
                  />
                  <input
                    placeholder="Floor"
                    value={form.floor}
                    onChange={e => setForm({ ...form, floor: e.target.value })}
                  />
                  <input
                    placeholder="Room No / Lab No"
                    value={form.roomNo}
                    onChange={e => setForm({ ...form, roomNo: e.target.value })}
                  />
                  <input
                    placeholder="Area / Landmark"
                    value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                  />

                  <textarea
                    placeholder="Description"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />

                  <button>Create Complaint</button>
                </form>
              </section>
            )}

            <section className="panel">
              <h3>
                {user.role === 'admin'
                  ? 'Admin Complaint Dashboard'
                  : user.role === 'staff'
                  ? 'Staff Assigned Complaints'
                  : 'My Complaint Dashboard'}{' '}
                <span className="live">● Live</span>
              </h3>

              <div className="filters">
                <input
                  placeholder="Search by title/location/student ID"
                  value={filter.search}
                  onChange={e => setFilter({ ...filter, search: e.target.value })}
                />

                <select
                  value={filter.status}
                  onChange={e => setFilter({ ...filter, status: e.target.value })}
                >
                  <option>All</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>

                <select
                  value={filter.category}
                  onChange={e => setFilter({ ...filter, category: e.target.value })}
                >
                  <option>All</option>
                  <option>Electrical</option>
                  <option>Plumbing</option>
                  <option>Internet</option>
                  <option>Cleaning</option>
                  <option>Furniture</option>
                  <option>Security</option>
                </select>
              </div>

              <div className="cards">
                {filtered.length === 0 && <p>No complaints found.</p>}

                {filtered.map(c => (
                  <div className="card" key={c.id}>
                    <div className="cardHead">
                      <h4>{c.title}</h4>
                      <span className={`badge ${String(c.status || '').replace(' ', '')}`}>
                        {c.status}
                      </span>
                    </div>

                    <p>{c.description}</p>
                    <small>{c.category} • {c.priority} Priority</small>

                    <div className="detailsBox">
                      <b>Complaint Location:</b> {c.location || 'N/A'}
                      <br />
                      <b>Target Resolve Date:</b> {formatDate(c.targetDate)}
                      <br />
                      <b>Raised By:</b> {c.createdByName || 'N/A'}
                      <br />
                      <b>Student/User ID:</b> {c.createdById || 'N/A'}
                      <br />
                      <b>Email:</b> {c.createdByEmail || 'N/A'}
                      <br />
                      <b>Assigned Staff:</b>{' '}
                      {c.assignedStaffName
                        ? `${c.assignedStaffName} (${c.assignedStaffId})`
                        : 'Not assigned'}
                    </div>

                    <div className="actions">
                      {user.role === 'admin' && (
                        <>
                          <select
                            value={assignData[c.id]?.staffId || c.assignedTo || ''}
                            onChange={e =>
                              setAssignData({
                                ...assignData,
                                [c.id]: {
                                  ...assignData[c.id],
                                  staffId: e.target.value
                                }
                              })
                            }
                          >
                            <option value="">Assign Staff</option>
                            {staff.map(s => (
                              <option key={s._id} value={s._id}>
                                {s.name} - {s.userId}
                              </option>
                            ))}
                          </select>

                          <input
                            type="date"
                            value={
                              assignData[c.id]?.targetDate ||
                              (c.targetDate ? String(c.targetDate).slice(0, 10) : '')
                            }
                            onChange={e => {
                              setAssignData({
                                ...assignData,
                                [c.id]: {
                                  ...assignData[c.id],
                                  targetDate: e.target.value
                                }
                              });

                              if (c.assignedTo) {
                                updateTargetDate(c.id, e.target.value);
                              }
                            }}
                          />

                          <button className="primaryActionBtn" onClick={() => assignComplaint(c.id)}>
                            Assign / Update Target
                          </button>
                        </>
                      )}

                      {(user.role === 'staff' || user.role === 'admin') && (
                        <select
                          value={c.status}
                          onChange={e => updateStatus(c.id, e.target.value)}
                        >
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      )}

                      {user.role === 'admin' && (
                        <button className="danger" onClick={() => deleteComplaint(c.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
