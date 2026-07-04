const express = require('express');
const router = express.Router();
const attendanceController = require('./attendanceController');
const { requireAdmin } = require('../middleware/auth');

router.get('/dashboard', attendanceController.renderDashboard);
router.post('/check-in', attendanceController.handleCheckIn);
router.post('/check-out', attendanceController.handleCheckOut);
router.post('/apply-leave', attendanceController.handleApplyLeave);

// Admin Routes
router.get('/admin-review', requireAdmin, attendanceController.renderAdminReview);
router.post('/leave-action', requireAdmin, attendanceController.handleLeaveAction);

module.exports = router;
