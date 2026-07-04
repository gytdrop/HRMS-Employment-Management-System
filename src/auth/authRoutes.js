const express = require('express');
const router = express.Router();
const authController = require('./authController');

router.get('/login', authController.renderLogin);
router.post('/login', authController.handleLogin);

router.get('/reset-password', authController.renderResetPassword);
router.post('/reset-password', authController.handleResetPassword);

router.get('/logout', authController.handleLogout);

// ── Credential inbox (demo panel on login page) ──────────────
router.get('/inbox', authController.getInbox);
router.post('/inbox/read', authController.markInboxRead);
router.get('/active-accounts', authController.getActiveAccounts);

module.exports = router;
