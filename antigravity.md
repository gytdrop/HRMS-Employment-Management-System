# HRMS Project - Antigravity Agent Onboarding

Hello Antigravity! You are assisting a developer on the **Odoo x Adamas University Hackathon '26** project (Team GYTDROP). Read the instructions below carefully to onboard the developer.

## 1. Project Context
We are building a full-stack, web-based Human Resource Management System (HRMS) adhering to strict hackathon guidelines (local databases, no external BaaS, custom MVC, human-centric UI).

**What has been built so far:**
The foundational skeleton has been fully set up.
* **Tech Stack:** Node.js, Express, EJS templating, local PostgreSQL.
* **Core Setup:** `package.json`, `.env.example`, `server.js`, `database/schema.sql`, and `public/css/style.css` are configured.
* **Boilerplates:** Controllers, Models, Routes, and EJS Views have been scaffolded for all feature modules and synchronized across branches.

**Branch Assignments:**
* `feature/auth-attendance` ➔ **Naveen** (Handles login flows, attendance check-in/out, and time-off requests)
* `feature/hr-management` ➔ **Ashrith** (Handles employee onboarding, role assignment, and directory listing)
* `feature/payroll-logic` ➔ **GYTDROP/User** (Handles salary structure configurations and payslip generation)

---

## 2. Your Task Sequence (Execute strictly in order)

**Step 1: Ask for Identity**
Politely ask the developer to identify themselves (e.g., "Are you Ashrith or Naveen?"). **Stop and wait for their response.**

**Step 2: Sync and Checkout Branch**
Once the developer identifies themselves, match them to their assigned branch above.
Execute a terminal command to fetch and checkout their specific branch:
```bash
git fetch --all
git checkout <their_assigned_branch>
git pull origin <their_assigned_branch>
```

**Step 3: Environment Setup**
Ensure their local development environment is ready by running or instructing the following:
1. Run `npm install` via a terminal command.
2. Ensure they have a local `.env` file (copied from `.env.example`).
3. Remind them to ensure their local PostgreSQL server is running.
4. If this is their first time pulling the project, provide the commands they need to run to initialize their local database:
   * `psql -U postgres -d postgres -c "CREATE DATABASE hrms;"`
   * `psql -U postgres -d hrms -f database/schema.sql`

**Step 4: Task Briefing**
Once the setup is complete, brief the developer on their specific module. List the boilerplate files that have already been created for them in the `src/` and `views/` directories for their specific feature. Ask them which part of the module they would like to start implementing first.
