const db = require('../../database/connection');

module.exports = {
  // Get today's attendance record for an employee
  getTodayRecord: async (employeeId) => {
    const query = `
      SELECT * FROM attendance 
      WHERE employee_id = $1 AND work_date = CURRENT_DATE
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows[0];
  },

  // Perform check-in
  checkIn: async (employeeId) => {
    const query = `
      INSERT INTO attendance (employee_id, work_date, check_in, status)
      VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'present')
      ON CONFLICT (employee_id, work_date) DO UPDATE 
      SET check_in = CURRENT_TIMESTAMP, status = 'present'
      RETURNING *
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows[0];
  },

  // Perform check-out
  checkOut: async (employeeId) => {
    const query = `
      UPDATE attendance 
      SET check_out = CURRENT_TIMESTAMP 
      WHERE id = (
        SELECT id FROM attendance 
        WHERE employee_id = $1 AND check_out IS NULL 
        ORDER BY work_date DESC LIMIT 1
      )
      RETURNING *
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows[0];
  },

  // Fetch recent attendance logs
  getLogs: async (employeeId, limit = 10) => {
    const query = `
      SELECT * FROM attendance 
      WHERE employee_id = $1 
      ORDER BY work_date DESC 
      LIMIT $2
    `;
    const res = await db.query(query, [employeeId, limit]);
    return res.rows;
  },

  // Get leave balances
  getLeaveBalances: async (employeeId) => {
    const query = `SELECT * FROM leave_balances WHERE employee_id = $1`;
    const res = await db.query(query, [employeeId]);
    return res.rows[0];
  },

  // Apply for time-off
  createLeaveRequest: async (employeeId, leaveType, startDate, endDate, reason) => {
    const query = `
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'Pending')
      RETURNING *
    `;
    const res = await db.query(query, [employeeId, leaveType, startDate, endDate, reason]);
    return res.rows[0];
  },

  // Get employee's leaves
  getLeaves: async (employeeId) => {
    const query = `
      SELECT * FROM leaves 
      WHERE employee_id = $1 
      ORDER BY start_date DESC
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows;
  },

  // Fetch all pending leave requests (for Admin)
  getAllPendingLeaves: async () => {
    const query = `
      SELECT l.*, e.first_name, e.last_name, e.login_id 
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      WHERE l.status = 'Pending'
      ORDER BY l.created_at ASC
    `;
    const res = await db.query(query);
    return res.rows;
  },

  // Admin action (Approve/Reject) on leave request
  // Transactional: deducts leave balances when Approved
  updateLeaveStatus: async (leaveId, status) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update the leave request status
      const leaveRes = await client.query(
        `UPDATE leaves SET status = $1 WHERE id = $2 RETURNING *`,
        [status, leaveId]
      );
      const leave = leaveRes.rows[0];

      // 2. If Approved, calculate days and deduct from balances
      if (status === 'Approved') {
        const daysRes = await client.query(
          `SELECT (end_date - start_date + 1) AS days FROM leaves WHERE id = $1`,
          [leaveId]
        );
        const days = daysRes.rows[0].days;

        if (leave.leave_type === 'Paid') {
          await client.query(
            `UPDATE leave_balances SET paid_leave_balance = paid_leave_balance - $1 WHERE employee_id = $2`,
            [days, leave.employee_id]
          );
        } else if (leave.leave_type === 'Sick') {
          await client.query(
            `UPDATE leave_balances SET sick_leave_balance = sick_leave_balance - $1 WHERE employee_id = $2`,
            [days, leave.employee_id]
          );
        } else if (leave.leave_type === 'Unpaid') {
          await client.query(
            `UPDATE leave_balances SET unpaid_leave_taken = unpaid_leave_taken + $1 WHERE employee_id = $2`,
            [days, leave.employee_id]
          );
        }
      }

      await client.query('COMMIT');
      return leave;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};
