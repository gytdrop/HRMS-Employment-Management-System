-- Drop tables if they exist (for easy environment resets)
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS salary_structures CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leaves CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- 1. Employees Table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    login_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    joining_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    serial_number INT NOT NULL,
    password_updated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Leave Balances Table
CREATE TABLE leave_balances (
    employee_id INT PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    paid_leave_balance INT NOT NULL DEFAULT 12,
    sick_leave_balance INT NOT NULL DEFAULT 10,
    unpaid_leave_taken INT NOT NULL DEFAULT 0
);

-- 3. Leaves Table
CREATE TABLE leaves (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('Paid', 'Sick', 'Unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- 4. Attendance Table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'leave')),
    CONSTRAINT unique_employee_date UNIQUE (employee_id, work_date)
);

-- 5. Salary Structures Table
CREATE TABLE salary_structures (
    employee_id INT PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    base_wage NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    basic_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hra NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payslips Table
CREATE TABLE payslips (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pay_period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    base_wage NUMERIC(10, 2) NOT NULL,
    basic_salary NUMERIC(10, 2) NOT NULL,
    hra NUMERIC(10, 2) NOT NULL,
    other_allowances NUMERIC(10, 2) NOT NULL,
    net_salary NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_period UNIQUE (employee_id, pay_period)
);
