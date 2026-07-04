/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 */

module.exports = {
  // Ensure the user is logged in
  requireLogin: (req, res, next) => {
    if (req.session && req.session.user) {
      // If password has not been updated on first login, force reset (unless they are already on the reset route)
      if (!req.session.user.password_updated && req.path !== '/auth/reset-password' && req.path !== '/auth/logout') {
        return res.redirect('/auth/reset-password');
      }
      return next();
    }
    res.redirect('/auth/login');
  },

  // Ensure the logged-in user is an Admin
  requireAdmin: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    res.status(403).render('error', {
      message: 'Access Denied: You do not have permissions to access this page.',
      user: req.session.user || null
    });
  },

  // Ensure the logged-in user is an Employee (restricted read-only style)
  requireEmployee: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'employee') {
      return next();
    }
    res.status(403).render('error', {
      message: 'Access Denied: Employees only.',
      user: req.session.user || null
    });
  }
};
