const AttendanceModel = require('./attendanceModel');

module.exports = {
  // Render employee attendance dashboard
  renderDashboard: async (req, res) => {
    try {
      const employeeId = req.session.user.id;
      
      const todayRecord = await AttendanceModel.getTodayRecord(employeeId);
      const recentLogs = await AttendanceModel.getLogs(employeeId);
      const leaveBalances = await AttendanceModel.getLeaveBalances(employeeId);
      const leaveHistory = await AttendanceModel.getLeaves(employeeId);

      res.render('attendance/dashboard', {
        title: 'HRMS - Attendance & Leave',
        activePage: 'attendance',
        todayRecord,
        recentLogs,
        leaveBalances: leaveBalances || { paid_leave_balance: 0, sick_leave_balance: 0, unpaid_leave_taken: 0 },
        leaveHistory,
        error: null,
        success: null
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to load attendance dashboard.' });
    }
  },

  // Handle Check-In
  handleCheckIn: async (req, res) => {
    try {
      await AttendanceModel.checkIn(req.session.user.id);
      res.redirect('/attendance/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Database error checking in.' });
    }
  },

  // Handle Check-Out
  handleCheckOut: async (req, res) => {
    try {
      await AttendanceModel.checkOut(req.session.user.id);
      res.redirect('/attendance/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Database error checking out.' });
    }
  },

  // Handle Leave Request Submission
  handleApplyLeave: async (req, res) => {
    const { leaveType, startDate, endDate, reason } = req.body;
    try {
      await AttendanceModel.createLeaveRequest(
        req.session.user.id,
        leaveType,
        startDate,
        endDate,
        reason
      );
      res.redirect('/attendance/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to submit leave request.' });
    }
  },

  // Render Admin Leaves Review Dashboard
  renderAdminReview: async (req, res) => {
    try {
      const pendingLeaves = await AttendanceModel.getAllPendingLeaves();
      res.render('attendance/admin-review', {
        title: 'HRMS - Review Time-Off Requests',
        activePage: 'attendance',
        pendingLeaves
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to fetch leave requests.' });
    }
  },

  // Handle Admin Action (Approve / Reject) on Leaves
  handleLeaveAction: async (req, res) => {
    const { leaveId, action } = req.body; // action: 'Approved' or 'Rejected'
    try {
      await AttendanceModel.updateLeaveStatus(leaveId, action);
      res.redirect('/attendance/admin-review');
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to update leave status.' });
    }
  }
};
