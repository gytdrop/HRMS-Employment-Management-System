const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hrms',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const firstNames = [
  'Amit', 'Rahul', 'Priya', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Nehal', 'Aditya', 'Pooja',
  'Sanjay', 'Deepika', 'Kunal', 'Ritu', 'Abhishek', 'Swati', 'Manish', 'Kavita', 'Saurabh', 'Neha',
  'Gaurav', 'Shreya', 'Vivek', 'Tanvi', 'Alok', 'Meera', 'Rajesh', 'Komal', 'Sunil', 'Jyoti'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Joshi', 'Mehta', 'Das', 'Sen', 'Nair',
  'Mishra', 'Reddy', 'Roy', 'Choudhury', 'Bose', 'Rao', 'Kulkarni', 'Pillai', 'Pandey', 'Saxena',
  'Deshmukh', 'Bannerjee', 'Dutta', 'Prasad', 'Thakur', 'Grover', 'Malhotra', 'Bahl', 'Johar', 'Kapoor'
];

function generateLoginId(firstName, lastName, year, serial) {
  const companyCode = 'ADAMAS';
  const cleanFirst = firstName.trim().replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
  const cleanLast = lastName.trim().replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
  const padSerial = String(serial).padStart(3, '0');
  return `${companyCode}${cleanFirst}${cleanLast}${year}${padSerial}`;
}

async function seedBulkData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get starting serial number for 2026
    const serialRes = await client.query(
      "SELECT COALESCE(MAX(serial_number), 0) as last_serial FROM employees WHERE joining_year = 2026"
    );
    let currentSerial = serialRes.rows[0].last_serial;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    console.log(`Seeding 30 employees, starting serial ID count: ${currentSerial + 1}...`);

    for (let i = 0; i < 30; i++) {
      currentSerial++;
      const firstName = firstNames[i];
      const lastName = lastNames[i];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${currentSerial}@adamas.com`;
      const loginId = generateLoginId(firstName, lastName, 2026, currentSerial);
      const role = 'employee';

      // 1. Insert Employee
      const empRes = await client.query(`
        INSERT INTO employees (login_id, first_name, last_name, email, password_hash, role, joining_year, serial_number, password_updated)
        VALUES ($1, $2, $3, $4, $5, $6, 2026, $7, TRUE)
        RETURNING id
      `, [loginId, firstName, lastName, email, hashedPassword, role, currentSerial]);
      
      const empId = empRes.rows[0].id;

      // 2. Initialize default Leave Balances
      await client.query(`
        INSERT INTO leave_balances (employee_id, paid_leave_balance, sick_leave_balance, unpaid_leave_taken)
        VALUES ($1, 12, 10, 0)
      `, [empId]);

      // 3. Set random salary parameters (between 30,000 and 95,000 basic)
      const basic = Math.floor(Math.random() * (95000 - 30000) + 30000);
      const hra = Math.floor(basic * 0.4);
      const allowances = Math.floor(basic * 0.15);
      const baseWage = basic + hra + allowances;

      await client.query(`
        INSERT INTO salary_structures (employee_id, base_wage, basic_salary, hra, other_allowances)
        VALUES ($1, $2, $3, $4, $5)
      `, [empId, baseWage, basic, hra, allowances]);

      // 4. Seed random past leaves (Approved or Pending)
      if (Math.random() > 0.4) {
        const startDay = Math.floor(Math.random() * 15) + 1;
        const duration = Math.floor(Math.random() * 3) + 1;
        const leaveType = ['Paid', 'Sick', 'Unpaid'][Math.floor(Math.random() * 3)];
        const status = ['Approved', 'Pending', 'Rejected'][Math.floor(Math.random() * 2)]; // Mostly Approved/Pending
        
        const startDate = `2026-06-${String(startDay).padStart(2, '0')}`;
        const endDate = `2026-06-${String(startDay + duration).padStart(2, '0')}`;

        await client.query(`
          INSERT INTO leaves (employee_id, leave_type, start_date, end_date, status, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [empId, leaveType, startDate, endDate, status, 'Vacation/Sick leave']);

        // Update balances if approved
        if (status === 'Approved') {
          const days = duration + 1;
          if (leaveType === 'Paid') {
            await client.query(`UPDATE leave_balances SET paid_leave_balance = paid_leave_balance - $1 WHERE employee_id = $2`, [days, empId]);
          } else if (leaveType === 'Sick') {
            await client.query(`UPDATE leave_balances SET sick_leave_balance = sick_leave_balance - $1 WHERE employee_id = $2`, [days, empId]);
          } else {
            await client.query(`UPDATE leave_balances SET unpaid_leave_taken = unpaid_leave_taken + $1 WHERE employee_id = $2`, [days, empId]);
          }
        }
      }

      // 5. Seed some basic attendance logs for June/July 2026
      await client.query(`
        INSERT INTO attendance (employee_id, work_date, check_in, check_out, status)
        VALUES ($1, '2026-07-01', '2026-07-01 09:00:00', '2026-07-01 17:30:00', 'present')
      `, [empId]);

      if (Math.random() > 0.3) {
        await client.query(`
          INSERT INTO attendance (employee_id, work_date, check_in, check_out, status)
          VALUES ($1, '2026-07-02', '2026-07-02 09:15:00', '2026-07-02 18:00:00', 'present')
        `, [empId]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Successfully seeded 30 employees with structures, leaves, and logs.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedBulkData();
