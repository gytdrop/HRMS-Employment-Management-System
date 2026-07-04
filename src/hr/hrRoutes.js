const express = require('express');
const router = express.Router();
const hrController = require('./hrController');
const { requireAdmin } = require('../middleware/auth');

// All HR routes require Admin access
router.use(requireAdmin);

router.get('/dashboard', hrController.renderDashboard);
router.post('/create', hrController.handleCreateEmployee);

router.get('/edit/:id', hrController.renderEditEmployee);
router.post('/edit/:id', hrController.handleUpdateEmployee);

router.post('/delete/:id', hrController.handleDeleteEmployee);

module.exports = router;
