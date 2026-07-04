# Human Resource Management System (HRMS)

A premium, human-centric Human Resource Management System designed for the Odoo x Adamas University Hackathon 2026. The platform utilizes a warm terracotta, amber, and cream color palette to create an organic, modern, and high-density enterprise dashboard. Built using Node.js, Express, EJS templating, and PostgreSQL.

## Core Features

- **Dashboard Engine**: Custom analytics panels rendering data visualizations through lightweight ApexCharts.
- **Attendance Integration**: Automated check-in/check-out logs, real-time presence tracking, and auto-calculated work duration metrics.
- **Dynamic Leave Management**: Leave request routing with multi-level approval stages. Automatically calculates date spans and deducts balances from employee records upon approval.
- **Payroll Processing**: Automated payslip generator with transactional calculation logic. Deducts unpaid leave or absent days directly from base wages.
- **Enterprise Onboarding**: System generated Login IDs and unique, random temporary passwords.
- **Demo Utility Panel**: Built-in credential helper sheet displaying newly onboarded accounts and active user lists to streamline hackathon presentations.

## Interface Demos

### Interactive Credentials Panel
The login screen features an inline demo accounts drawer listing newly onboarded employee credentials and active accounts with single-click copy utility.

![Demo Inbox Drawer](public/images/demo_inbox.png)

### Walkthrough & Interaction
A recorded session showing login workflows, slide-out dashboards, and fluid navigation states.

![Demo Flow Walkthrough](public/images/demo_interaction.webp)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg client)
- **Templating**: EJS (Embedded JavaScript)
- **Styling**: Custom CSS (supporting light and dark mode toggles)
- **Data Visualization**: ApexCharts

## Setup Instructions

### Prerequisites
- Node.js (version 18 or higher)
- PostgreSQL (running locally or remotely)

### Database Configuration
1. Initialize the schema using the provided SQL file:
   ```bash
   psql -U postgres -d hrms -f database/schema.sql
   ```
2. By default, the schema setups default admin and employee seeds.

### Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=hrms
DB_PASSWORD=your_postgres_password
DB_PORT=5432
SESSION_SECRET=your_secure_secret
COMPANY_CODE=ADAMAS
```

### Installation & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.
