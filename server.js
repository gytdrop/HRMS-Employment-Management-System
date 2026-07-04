const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup EJS views engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'hrms_default_session_secret_123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Global views variable helper
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Import Middlewares
const { requireLogin } = require('./src/middleware/auth');

// Root Route
app.get('/', requireLogin, (req, res) => {
  // If user is Admin, redirect to HR dashboard, else to Attendance dashboard
  if (req.session.user.role === 'admin') {
    res.redirect('/hr/dashboard');
  } else {
    res.redirect('/attendance/dashboard');
  }
});

// Load Modules Routes (Placeholders loaded for branching integration)
try {
  const authRoutes = require('./src/auth/authRoutes');
  app.use('/auth', authRoutes);
} catch (e) {
  console.log('ℹ️ Auth routes not yet loaded (Waiting for feature/auth-attendance branch)');
}

try {
  const attendanceRoutes = require('./src/attendance/attendanceRoutes');
  app.use('/attendance', requireLogin, attendanceRoutes);
} catch (e) {
  console.log('ℹ️ Attendance routes not yet loaded (Waiting for feature/auth-attendance branch)');
}

try {
  const hrRoutes = require('./src/hr/hrRoutes');
  app.use('/hr', requireLogin, hrRoutes);
} catch (e) {
  console.log('ℹ️ HR routes not yet loaded (Waiting for feature/hr-management branch)');
}

try {
  const payrollRoutes = require('./src/payroll/payrollRoutes');
  app.use('/payroll', requireLogin, payrollRoutes);
} catch (e) {
  console.log('ℹ️ Payroll routes not yet loaded (Waiting for feature/payroll-logic branch)');
}

// 404 Route
app.use((req, res) => {
  res.status(404).render('error', {
    message: `Page Not Found: ${req.originalUrl}`,
    user: req.session.user || null
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 HRMS Server running at http://localhost:${PORT}`);
});
