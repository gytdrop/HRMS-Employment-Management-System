const db = require('../../database/connection');

module.exports = {
  // Get salary structure for a specific employee
  getStructureByEmployeeId: async (employeeId) => {
    const query = `
      SELECT s.*, e.first_name, e.last_name, e.login_id 
      FROM salary_structures s
      JOIN employees e ON s.employee_id = e.id
      WHERE s.employee_id = $1
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows[0];
  },

  // Get salary structures for all employees
  getAllStructures: async () => {
    const query = `
      SELECT s.*, e.first_name, e.last_name, e.login_id 
      FROM salary_structures s
      JOIN employees e ON s.employee_id = e.id
      ORDER BY e.id ASC
    `;
    const res = await db.query(query);
    return res.rows;
  },

  // Update or Insert salary structure
  upsertStructure: async (employeeId, { baseWage, basicSalary, hra, otherAllowances }) => {
    const query = `
      INSERT INTO salary_structures (employee_id, base_wage, basic_salary, hra, other_allowances, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id) DO UPDATE 
      SET base_wage = $2, basic_salary = $3, hra = $4, other_allowances = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const res = await db.query(query, [employeeId, baseWage, basicSalary, hra, otherAllowances]);
    return res.rows[0];
  },

  // Get all payslips for an employee
  getPayslipsByEmployeeId: async (employeeId) => {
    const query = `
      SELECT * FROM payslips 
      WHERE employee_id = $1 
      ORDER BY pay_period DESC
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows;
  },

  // Get payslip by ID
  getPayslipById: async (id) => {
    const query = `
      SELECT p.*, e.first_name, e.last_name, e.login_id, e.email
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.id = $1
    `;
    const res = await db.query(query, [id]);
    return res.rows[0];
  },

  // Generate a new payslip
  createPayslip: async ({ employeeId, payPeriod, baseWage, basicSalary, hra, otherAllowances, netSalary }) => {
    const query = `
      INSERT INTO payslips (employee_id, pay_period, base_wage, basic_salary, hra, other_allowances, net_salary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (employee_id, pay_period) DO UPDATE 
      SET base_wage = $3, basic_salary = $4, hra = $5, other_allowances = $6, net_salary = $7
      RETURNING *
    `;
    const res = await db.query(query, [
      employeeId,
      payPeriod,
      baseWage,
      basicSalary,
      hra,
      otherAllowances,
      netSalary
    ]);
    return res.rows[0];
  }
};
