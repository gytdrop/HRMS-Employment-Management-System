const bcrypt = require('bcryptjs');
const AuthModel = require('./authModel');

module.exports = {
  // Render login view
  renderLogin: (req, res) => {
    if (req.session.user) {
      return res.redirect('/');
    }
    res.render('auth/login', { error: null, title: 'HRMS - Login' });
  },

  // Handle Login Post
  handleLogin: async (req, res) => {
    const { loginOrEmail, password } = req.body;
    try {
      const user = await AuthModel.findByLoginOrEmail(loginOrEmail);
      if (!user) {
        return res.render('auth/login', { error: 'Invalid login ID or email', title: 'HRMS - Login' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.render('auth/login', { error: 'Invalid password', title: 'HRMS - Login' });
      }

      // Store in session (excluding password_hash for safety)
      req.session.user = {
        id: user.id,
        login_id: user.login_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        password_updated: user.password_updated
      };

      if (!user.password_updated) {
        return res.redirect('/auth/reset-password');
      }

      res.redirect('/');
    } catch (err) {
      console.error(err);
      res.render('auth/login', { error: 'An unexpected database error occurred', title: 'HRMS - Login' });
    }
  },

  // Render Password Reset view
  renderResetPassword: (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    res.render('auth/reset-password', { error: null, success: null, title: 'HRMS - Reset Password' });
  },

  // Handle Password Reset Post
  handleResetPassword: async (req, res) => {
    const { password, confirmPassword } = req.body;
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    if (password !== confirmPassword) {
      return res.render('auth/reset-password', { error: 'Passwords do not match', success: null, title: 'HRMS - Reset Password' });
    }

    if (password.length < 6) {
      return res.render('auth/reset-password', { error: 'Password must be at least 6 characters long', success: null, title: 'HRMS - Reset Password' });
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await AuthModel.updatePassword(req.session.user.id, hashedPassword);
      
      // Update session state
      req.session.user.password_updated = true;

      res.render('auth/reset-password', { error: null, success: 'Password reset successful! Redirecting...', title: 'HRMS - Reset Password' });
    } catch (err) {
      console.error(err);
      res.render('auth/reset-password', { error: 'Error resetting password', success: null, title: 'HRMS - Reset Password' });
    }
  },

  // Handle Logout
  handleLogout: (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error(err);
      res.redirect('/auth/login');
    });
  }
};
