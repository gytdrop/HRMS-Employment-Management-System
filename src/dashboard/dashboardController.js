const DashboardModel = require('./dashboardModel');
const AttendanceModel = require('../attendance/attendanceModel');
const PayrollModel = require('../payroll/payrollModel');
const HrModel = require('../hr/hrModel');

module.exports = {
  /**
   * Renders the right dashboard based on user role.
   *  - admin   -> views/admin/dashboard
   *  - employee-> views/employee/dashboard
   */
  renderHome: async (req, res) => {
    try {
      const user = req.session.user;
      if (user.role === 'admin') {
        return module.exports.renderAdmin(req, res);
      }
      return module.exports.renderEmployee(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to load dashboard.' });
    }
  },

  renderAdmin: async (req, res) => {
    try {
      // Stats
      const employees = await HrModel.getAll();
      const totalEmployees = employees.length;

      const [onLeaveToday, pendingLeaves, payrollTotal, attendanceTrend, leaveDistribution] = await Promise.all([
        DashboardModel.getOnLeaveToday(),
        DashboardModel.getPendingLeavesCount(),
        DashboardModel.getCurrentMonthPayrollTotal(),
        DashboardModel.getMonthlyAttendanceTrend(6),
        DashboardModel.getLeaveDistribution(6)
      ]);

      // Recent activity for sidebar cards
      const recentLeaves = await AttendanceModel.getAllPendingLeaves(); // pending list with names

      res.render('admin/dashboard', {
        title: 'HRMS - Dashboard',
        activePage: 'home',
        user: req.session.user,
        stats: {
          totalEmployees,
          onLeaveToday,
          pendingLeaves,
          payrollTotal
        },
        attendanceTrend,
        leaveDistribution,
        recentLeaves: recentLeaves.slice(0, 5)
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to load admin dashboard.' });
    }
  },

  renderEmployee: async (req, res) => {
    try {
      const employeeId = req.session.user.id;

      const [
        todayRecord,
        leaveBalances,
        recentLogs,
        leaveHistory,
        payslips,
        structure,
        pendingLeaves,
        monthLeaveDays
      ] = await Promise.all([
        AttendanceModel.getTodayRecord(employeeId),
        AttendanceModel.getLeaveBalances(employeeId),
        AttendanceModel.getLogs(employeeId, 5),
        AttendanceModel.getLeaves(employeeId),
        PayrollModel.getPayslipsByEmployeeId(employeeId),
        PayrollModel.getStructureByEmployeeId(employeeId),
        DashboardModel.getEmployeePendingLeavesCount(employeeId),
        DashboardModel.getEmployeeMonthLeaveDays(employeeId)
      ]);

      const latestPayslip = (payslips && payslips.length) ? payslips[0] : null;
      const struct = structure || { base_wage: 0, basic_salary: 0, hra: 0, other_allowances: 0 };
      const monthlyNet = parseFloat(struct.basic_salary || 0)
                       + parseFloat(struct.hra || 0)
                       + parseFloat(struct.other_allowances || 0);

      // Today's status label
      let todayStatus = 'Not Checked In';
      let todayStatusType = 'absent';
      if (todayRecord && todayRecord.check_in) {
        todayStatus = todayRecord.check_out ? 'Checked Out' : 'Checked In';
        todayStatusType = 'present';
      }

      res.render('employee/dashboard', {
        title: 'HRMS - My Dashboard',
        activePage: 'home',
        user: req.session.user,
        stats: {
          todayStatus,
          todayStatusType,
          todayCheckedInAt: todayRecord && todayRecord.check_in
            ? new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          paidLeaveBalance: (leaveBalances && leaveBalances.paid_leave_balance) || 0,
          sickLeaveBalance: (leaveBalances && leaveBalances.sick_leave_balance) || 0,
          monthlyNet,
          latestPayslipNet: latestPayslip ? parseFloat(latestPayslip.net_salary) : null,
          latestPayslipPeriod: latestPayslip ? latestPayslip.pay_period : null,
          latestPayslipId: latestPayslip ? latestPayslip.id : null,
          pendingLeaves,
          monthLeaveDays
        },
        recentLogs: recentLogs || [],
        recentLeaves: (leaveHistory || []).slice(0, 4)
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to load employee dashboard.' });
    }
  }
};
