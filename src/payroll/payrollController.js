const PayrollModel = require('./payrollModel');
const { sendPayslipEmail } = require('../utils/mailer');

module.exports = {
  // Render payroll dashboard (Admin views all employee salary structures, Employee views their own)
  renderDashboard: async (req, res) => {
    try {
      const isAdmin = req.session.user.role === 'admin';
      const employeeId = req.session.user.id;

      if (isAdmin) {
        // Admin views all employees' structures
        const structures = await PayrollModel.getAllStructures();
        res.render('payroll/dashboard', {
          title: 'HRMS - Payroll Management',
          activePage: 'payroll',
          structures,
          error: null,
          success: null
        });
      } else {
        // Employee views their own structure and historical payslips
        const structure = await PayrollModel.getStructureByEmployeeId(employeeId);
        const payslips = await PayrollModel.getPayslipsByEmployeeId(employeeId);
        
        res.render('payroll/dashboard', {
          title: 'HRMS - My Payslips',
          activePage: 'payroll',
          structure: structure || { base_wage: 0, basic_salary: 0, hra: 0, other_allowances: 0 },
          payslips,
          error: null,
          success: null
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to load payroll dashboard.' });
    }
  },

  // Handle Admin update of employee salary structure
  handleUpdateStructure: async (req, res) => {
    const { employeeId, baseWageInput, otherAllowancesInput } = req.body;
    try {
      const baseWage = parseFloat(baseWageInput || 0);
      const otherAllowances = parseFloat(otherAllowancesInput || 0);

      // Math logic: Basic (B) = 50% of W. HRA = 50% of B (25% of W).
      const basicSalary = baseWage * 0.50;
      const hra = basicSalary * 0.50;

      // Validation check: B + HRA + Other <= W
      const totalComponentsSum = basicSalary + hra + otherAllowances;
      
      if (totalComponentsSum > baseWage) {
        const structures = await PayrollModel.getAllStructures();
        return res.render('payroll/dashboard', {
          title: 'HRMS - Payroll Management',
          activePage: 'payroll',
          structures,
          error: `Validation Error: Sum of Basic ($${basicSalary}) + HRA ($${hra}) + Other ($${otherAllowances}) = $${totalComponentsSum} exceeds the defined Base Wage ($${baseWage}).`,
          success: null
        });
      }

      await PayrollModel.upsertStructure(employeeId, {
        baseWage,
        basicSalary,
        hra,
        otherAllowances
      });

      const structures = await PayrollModel.getAllStructures();
      res.render('payroll/dashboard', {
        title: 'HRMS - Payroll Management',
        activePage: 'payroll',
        structures,
        error: null,
        success: 'Salary structure updated successfully!'
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Database error updating salary structure.' });
    }
  },

  // Handle Admin Generating Payslip for Employee
  handleGeneratePayslip: async (req, res) => {
    const { employeeId, payPeriod } = req.body; // payPeriod format: YYYY-MM
    try {
      // Get the employee's current salary structure
      const struct = await PayrollModel.getStructureByEmployeeId(employeeId);
      if (!struct || parseFloat(struct.base_wage) === 0) {
        const structures = await PayrollModel.getAllStructures();
        return res.render('payroll/dashboard', {
          title: 'HRMS - Payroll Management',
          activePage: 'payroll',
          structures,
          error: 'Cannot generate payslip. Please define a base wage first.',
          success: null
        });
      }

      // Parse period and calculate dates
      const [yearStr, monthStr] = payPeriod.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));

      const daysInMonth = endDate.getUTCDate();
      const startDateStr = startDate.toISOString().substring(0, 10);
      const endDateStr = endDate.toISOString().substring(0, 10);

      // Fetch unpaid days metrics
      const unpaidLeaveDays = await PayrollModel.getUnpaidLeaveDaysCount(employeeId, startDateStr, endDateStr);
      const absentDays = await PayrollModel.getAbsentDaysCount(employeeId, startDateStr, endDateStr);
      const totalUnpaidDays = unpaidLeaveDays + absentDays;

      const baseWage = parseFloat(struct.base_wage);
      const basicSalary = parseFloat(struct.basic_salary);
      const hra = parseFloat(struct.hra);
      const otherAllowances = parseFloat(struct.other_allowances);

      // Deduct pro-rated rate per unpaid/absent day
      const dailyRate = baseWage / daysInMonth;
      const deductions = Math.round((totalUnpaidDays * dailyRate) * 100) / 100;

      // Net Salary = components sum - deductions (min 0)
      const netSalary = Math.max(0, Math.round((basicSalary + hra + otherAllowances - deductions) * 100) / 100);

      await PayrollModel.createPayslip({
        employeeId,
        payPeriod,
        baseWage,
        basicSalary,
        hra,
        otherAllowances,
        deductions,
        netSalary
      });

      // Send automated email notification asynchronously (non-blocking)
      sendPayslipEmail(
        struct.email,
        struct.first_name,
        payPeriod,
        basicSalary,
        hra,
        otherAllowances,
        deductions,
        netSalary
      ).catch(e => console.error('❌ Failed to send payslip email:', e));

      const structures = await PayrollModel.getAllStructures();
      res.render('payroll/dashboard', {
        title: 'HRMS - Payroll Management',
        activePage: 'payroll',
        structures,
        error: null,
        success: `Payslip for period ${payPeriod} generated successfully! (${totalUnpaidDays} unpaid days deducted: $${deductions.toFixed(2)})`
      });
    } catch (err) {
      console.error(err);
      const structures = await PayrollModel.getAllStructures();
      res.render('payroll/dashboard', {
        title: 'HRMS - Payroll Management',
        activePage: 'payroll',
        structures,
        error: err.message.includes('unique') ? `Payslip for period ${payPeriod} already exists.` : 'Failed to generate payslip.',
        success: null
      });
    }
  },

  // View Payslip details
  renderPayslip: async (req, res) => {
    const { id } = req.params;
    try {
      const payslip = await PayrollModel.getPayslipById(id);
      if (!payslip) {
        return res.status(404).render('error', { message: 'Payslip not found.' });
      }

      // Security check: Employee can only view their own payslip
      if (req.session.user.role !== 'admin' && payslip.employee_id !== req.session.user.id) {
        return res.status(403).render('error', { message: 'Access Denied: You cannot view this payslip.' });
      }

      res.render('payroll/view-payslip', {
        title: `HRMS - Payslip ${payslip.pay_period}`,
        activePage: 'payroll',
        payslip
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Database error fetching payslip.' });
    }
  }
};
