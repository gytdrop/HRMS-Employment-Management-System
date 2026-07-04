const db = require('../../database/connection');

module.exports = {
  // Get all employees
  getAll: async () => {
    const query = `
      SELECT id, login_id, first_name, last_name, email, role, joining_year, serial_number, password_updated, created_at 
      FROM employees 
      ORDER BY id ASC
    `;
    const res = await db.query(query);
    return res.rows;
  },

  // Get employee by ID
  findById: async (id) => {
    const query = `
      SELECT id, login_id, first_name, last_name, email, role, joining_year, serial_number, password_updated, created_at 
      FROM employees 
      WHERE id = $1
    `;
    const res = await db.query(query, [id]);
    return res.rows[0];
  },

  // Get last serial number for the current year (to increment)
  getLastSerialNumber: async (year) => {
    const query = `
      SELECT COALESCE(MAX(serial_number), 0) as last_serial 
      FROM employees 
      WHERE joining_year = $1
    `;
    const res = await db.query(query, [year]);
    return res.rows[0].last_serial;
  },

  // Create new employee (transaction to ensure leave balances and salary structure are created)
  create: async ({ loginId, firstName, lastName, email, passwordHash, role, year, serialNumber }) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Employee
      const empQuery = `
        INSERT INTO employees (login_id, first_name, last_name, email, password_hash, role, joining_year, serial_number, password_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
        RETURNING id
      `;
      const empRes = await client.query(empQuery, [
        loginId,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        year,
        serialNumber
      ]);
      const employeeId = empRes.rows[0].id;

      // 2. Initialize default Leave Balances (12 Paid, 10 Sick)
      const leaveQuery = `
        INSERT INTO leave_balances (employee_id, paid_leave_balance, sick_leave_balance, unpaid_leave_taken)
        VALUES ($1, 12, 10, 0)
      `;
      await client.query(leaveQuery, [employeeId]);

      // 3. Initialize default Salary Structure (Base wage 0.00 initially)
      const salaryQuery = `
        INSERT INTO salary_structures (employee_id, base_wage, basic_salary, hra, other_allowances)
        VALUES ($1, 0.00, 0.00, 0.00, 0.00)
      `;
      await client.query(salaryQuery, [employeeId]);

      await client.query('COMMIT');
      return employeeId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Update employee details
  update: async (id, { firstName, lastName, email, role }) => {
    const query = `
      UPDATE employees 
      SET first_name = $1, last_name = $2, email = $3, role = $4 
      WHERE id = $5
      RETURNING id, login_id, first_name, last_name, email, role
    `;
    const res = await db.query(query, [firstName, lastName, email, role, id]);
    return res.rows[0];
  },

  // Delete employee (cascades automatically to leave balances, salaries, etc.)
  delete: async (id) => {
    const query = `DELETE FROM employees WHERE id = $1`;
    await db.query(query, [id]);
  }
};
