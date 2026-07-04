const express = require('express');
const router = express.Router();
const payrollController = require('./payrollController');
const { requireAdmin } = require('../middleware/auth');

router.get('/dashboard', payrollController.renderDashboard);
router.get('/payslip/:id', payrollController.renderPayslip);

// Admin Routes
router.post('/update-structure', requireAdmin, payrollController.handleUpdateStructure);
router.post('/generate-payslip', requireAdmin, payrollController.handleGeneratePayslip);

module.exports = router;
