const db = require('../../database/connection');

module.exports = {
  // Find employee by email or Login ID
  findByLoginOrEmail: async (loginOrEmail) => {
    const query = `
      SELECT * FROM employees 
      WHERE login_id = $1 OR email = $1
    `;
    const res = await db.query(query, [loginOrEmail]);
    return res.rows[0];
  },

  // Find employee by ID
  findById: async (id) => {
    const query = `SELECT * FROM employees WHERE id = $1`;
    const res = await db.query(query, [id]);
    return res.rows[0];
  },

  // Update password and flag password_updated to true
  updatePassword: async (employeeId, hashedPassword) => {
    const query = `
      UPDATE employees 
      SET password_hash = $1, password_updated = TRUE 
      WHERE id = $2
      RETURNING *
    `;
    const res = await db.query(query, [hashedPassword, employeeId]);
    return res.rows[0];
  }
};
