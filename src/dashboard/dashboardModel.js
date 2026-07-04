const db = require('../../database/connection');

module.exports = {
  /**
   * Org-wide monthly attendance trend for the last `months` months.
   * Returns an array of length `months` with shape:
   *   { month: 'Jan', present: N, absent: N, leave: N }
   * The `leave` series counts approved leaves whose start_date falls in that month.
   */
  getMonthlyAttendanceTrend: async (months = 6) => {
    const query = `
      WITH months AS (
        SELECT date_trunc('month', CURRENT_DATE - (n || ' months')::interval) AS month_start
        FROM generate_series(0, $1::int - 1) n
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month,
        EXTRACT(MONTH FROM m.month_start)::int AS month_num,
        EXTRACT(YEAR  FROM m.month_start)::int AS year_num,
        COALESCE(present.cnt, 0) AS present,
        COALESCE(absent.cnt, 0)  AS absent,
        COALESCE(leave_.cnt, 0)  AS leave
      FROM months m
      LEFT JOIN (
        SELECT date_trunc('month', work_date) AS m, COUNT(*) AS cnt
        FROM attendance WHERE status = 'present' GROUP BY 1
      ) present ON present.m = m.month_start
      LEFT JOIN (
        SELECT date_trunc('month', work_date) AS m, COUNT(*) AS cnt
        FROM attendance WHERE status = 'absent' GROUP BY 1
      ) absent ON absent.m = m.month_start
      LEFT JOIN (
        SELECT date_trunc('month', start_date) AS m, COUNT(*) AS cnt
        FROM leaves WHERE status = 'Approved' GROUP BY 1
      ) leave_ ON leave_::text::date IS NOT NULL AND leave_.m = m.month_start
      ORDER BY m.month_start
    `;

    // The LEFT JOIN on `leave_` in the CTE above uses a slightly fragile alias cast;
    // run a simpler version that's known to work.
    const safeQuery = `
      WITH months AS (
        SELECT date_trunc('month', CURRENT_DATE - (n || ' months')::interval) AS month_start
        FROM generate_series(0, $1::int - 1) n
      ),
      present_agg AS (
        SELECT date_trunc('month', work_date) AS m, COUNT(*)::int AS cnt
        FROM attendance WHERE status = 'present' GROUP BY 1
      ),
      absent_agg AS (
        SELECT date_trunc('month', work_date) AS m, COUNT(*)::int AS cnt
        FROM attendance WHERE status = 'absent' GROUP BY 1
      ),
      leave_agg AS (
        SELECT date_trunc('month', start_date) AS m, COUNT(*)::int AS cnt
        FROM leaves WHERE status = 'Approved' GROUP BY 1
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month,
        COALESCE(p.cnt, 0) AS present,
        COALESCE(a.cnt, 0) AS absent,
        COALESCE(l.cnt, 0) AS leave
      FROM months m
      LEFT JOIN present_agg p ON p.m = m.month_start
      LEFT JOIN absent_agg  a ON a.m = m.month_start
      LEFT JOIN leave_agg   l ON l.m = m.month_start
      ORDER BY m.month_start
    `;

    const res = await db.query(safeQuery, [months]);
    return res.rows;
  },

  /**
   * Leave-type distribution over the last `months` months (approved leaves only).
   * Returns { paid: N, sick: N, unpaid: N }.
   */
  getLeaveDistribution: async (months = 6) => {
    const query = `
      SELECT leave_type, COUNT(*)::int AS cnt
      FROM leaves
      WHERE status = 'Approved'
        AND start_date >= (CURRENT_DATE - ($1::int || ' months')::interval)
      GROUP BY leave_type
    `;
    const res = await db.query(query, [months]);

    const dist = { paid: 0, sick: 0, unpaid: 0 };
    res.rows.forEach((r) => {
      const k = (r.leave_type || '').toLowerCase();
      if (k in dist) dist[k] = r.cnt;
    });
    return dist;
  },

  /**
   * Admin: number of employees who are on approved leave TODAY.
   * Counts distinct employees with an Approved leave whose date range covers today.
   */
  getOnLeaveToday: async () => {
    const query = `
      SELECT COUNT(DISTINCT employee_id)::int AS cnt
      FROM leaves
      WHERE status = 'Approved'
        AND CURRENT_DATE BETWEEN start_date AND end_date
    `;
    const res = await db.query(query);
    return res.rows[0].cnt;
  },

  /**
   * Admin: number of pending leave requests org-wide.
   */
  getPendingLeavesCount: async () => {
    const query = `SELECT COUNT(*)::int AS cnt FROM leaves WHERE status = 'Pending'`;
    const res = await db.query(query);
    return res.rows[0].cnt;
  },

  /**
   * Admin: total net payout of payslips generated for the current month.
   * `pay_period` is stored as 'YYYY-MM'.
   */
  getCurrentMonthPayrollTotal: async () => {
    const query = `
      SELECT COALESCE(SUM(net_salary), 0)::numeric AS total
      FROM payslips
      WHERE pay_period = to_char(CURRENT_DATE, 'YYYY-MM')
    `;
    const res = await db.query(query);
    return parseFloat(res.rows[0].total || 0);
  },

  /**
   * Employee: number of their pending leave requests.
   */
  getEmployeePendingLeavesCount: async (employeeId) => {
    const query = `SELECT COUNT(*)::int AS cnt FROM leaves WHERE employee_id = $1 AND status = 'Pending'`;
    const res = await db.query(query, [employeeId]);
    return res.rows[0].cnt;
  },

  /**
   * Employee: number of approved leave days in the current calendar month.
   * Used for the "Days taken this month" stat.
   */
  getEmployeeMonthLeaveDays: async (employeeId) => {
    const query = `
      SELECT COALESCE(SUM(
        LEAST(end_date, date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
        - GREATEST(start_date, date_trunc('month', CURRENT_DATE)::date) + 1
      ), 0)::int AS days
      FROM leaves
      WHERE employee_id = $1
        AND status = 'Approved'
        AND start_date <= date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'
        AND end_date >= date_trunc('month', CURRENT_DATE)::date
    `;
    const res = await db.query(query, [employeeId]);
    return res.rows[0].days;
  }
};
