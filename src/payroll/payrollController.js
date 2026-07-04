const PayrollModel = require('./payrollModel');

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

      const baseWage = parseFloat(struct.base_wage);
      const basicSalary = parseFloat(struct.basic_salary);
      const hra = parseFloat(struct.hra);
      const otherAllowances = parseFloat(struct.other_allowances);
      const netSalary = basicSalary + hra + otherAllowances; // Deductions can be added later as needed

      await PayrollModel.createPayslip({
        employeeId,
        payPeriod,
        baseWage,
        basicSalary,
        hra,
        otherAllowances,
        netSalary
      });

      const structures = await PayrollModel.getAllStructures();
      res.render('payroll/dashboard', {
        title: 'HRMS - Payroll Management',
        activePage: 'payroll',
        structures,
        error: null,
        success: `Payslip for period ${payPeriod} generated successfully!`
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
