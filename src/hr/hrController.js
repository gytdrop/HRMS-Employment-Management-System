const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const HrModel = require('./hrModel');
const { sendOnboardingEmail } = require('../utils/mailer');
require('dotenv').config();

// Helper to generate Login ID
const generateLoginId = (firstName, lastName, year, serial) => {
  const companyCode = (process.env.COMPANY_CODE || 'ADAMAS').toUpperCase();
  
  // Extract and clean first two letters of first and last name
  const cleanFirst = (firstName.replace(/[^a-zA-Z]/g, '') + 'XX').substring(0, 2).toUpperCase();
  const cleanLast = (lastName.replace(/[^a-zA-Z]/g, '') + 'XX').substring(0, 2).toUpperCase();
  
  // Format serial number to 3-digit padding (e.g., 001, 012, 123)
  const paddedSerial = String(serial).padStart(3, '0');
  
  return `${companyCode}${cleanFirst}${cleanLast}${year}${paddedSerial}`;
};

// Helper to generate a random secure password
const generateRandomPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = '@#$!&*';
  const all = upper + lower + digits + specials;
  
  // Guarantee at least one of each required character type
  let password = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    specials[crypto.randomInt(specials.length)],
  ];
  
  // Fill the rest to reach length 10
  for (let i = 4; i < 10; i++) {
    password.push(all[crypto.randomInt(all.length)]);
  }
  
  // Shuffle the array
  return password.sort(() => crypto.randomInt(3) - 1).join('');
};

module.exports = {
  // Render Admin HR Dashboard (displays list of all employees)
  renderDashboard: async (req, res) => {
    try {
      const employees = await HrModel.getAll();
      res.render('hr/dashboard', {
        title: 'HRMS - Manage Employees',
        activePage: 'hr',
        employees,
        error: null,
        success: null
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to load employee list.' });
    }
  },

  // Handle Employee Onboarding Post (Create Employee)
  handleCreateEmployee: async (req, res) => {
    const { firstName, lastName, email, role } = req.body;
    try {
      const currentYear = new Date().getFullYear();
      
      // Get next serial number
      const lastSerial = await HrModel.getLastSerialNumber(currentYear);
      const nextSerial = lastSerial + 1;

      // Generate Login ID
      const loginId = generateLoginId(firstName, lastName, currentYear, nextSerial);

      // Generate a random secure password
      const randomPassword = generateRandomPassword();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      // Save to database
      await HrModel.create({
        loginId,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        year: currentYear,
        serialNumber: nextSerial
      });

      // Send welcome email with credentials
      const emailResult = await sendOnboardingEmail(email, firstName, loginId, randomPassword);

      const emailNote = emailResult.sent
        ? `A welcome email with login credentials has been sent to <strong>${email}</strong>.`
        : `SMTP not configured — credentials: Login ID: <code>${loginId}</code> | Password: <code>${randomPassword}</code> (check server console)`;

      const employees = await HrModel.getAll();
      res.render('hr/dashboard', {
        title: 'HRMS - Manage Employees',
        activePage: 'hr',
        employees,
        error: null,
        success: `Employee <strong>${firstName} ${lastName}</strong> onboarded! Login ID: <code>${loginId}</code>. ${emailNote}`
      });
    } catch (err) {
      console.error(err);
      const employees = await HrModel.getAll();
      res.render('hr/dashboard', {
        title: 'HRMS - Manage Employees',
        activePage: 'hr',
        employees,
        error: err.message.includes('unique') ? 'Email or Login ID already exists.' : 'Database error onboarding employee.',
        success: null
      });
    }
  },

  // Render Edit Employee Page
  renderEditEmployee: async (req, res) => {
    const { id } = req.params;
    try {
      const employee = await HrModel.findById(id);
      if (!employee) {
        return res.status(404).render('error', { message: 'Employee not found.' });
      }
      res.render('hr/edit-employee', {
        title: `HRMS - Edit ${employee.first_name}`,
        activePage: 'hr',
        employee,
        error: null,
        success: null
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Database error fetching employee.' });
    }
  },

  // Handle Edit Employee Post
  handleUpdateEmployee: async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, role } = req.body;
    try {
      const updated = await HrModel.update(id, { firstName, lastName, email, role });
      res.render('hr/edit-employee', {
        title: `HRMS - Edit ${updated.first_name}`,
        activePage: 'hr',
        employee: updated,
        error: null,
        success: 'Employee details updated successfully!'
      });
    } catch (err) {
      console.error(err);
      const employee = await HrModel.findById(id);
      res.render('hr/edit-employee', {
        title: `HRMS - Edit ${employee.first_name}`,
        activePage: 'hr',
        employee,
        error: 'Failed to update employee details.',
        success: null
      });
    }
  },

  // Handle Employee Deletion
  handleDeleteEmployee: async (req, res) => {
    const { id } = req.params;
    try {
      await HrModel.delete(id);
      res.redirect('/hr/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Failed to delete employee.' });
    }
  }
};
