CodeAlpha_Event_Registration_System
Backend projects from CodeAlpha

An Event Registration System

A secure, high-performance backend web service and server-side rendered application built with Node.js, Express, and PostgreSQL.

Features
Core Backend Functionality
User Authentication & Authorization: Secure user registration, login, and session persistence using Express sessions and PostgreSQL.

Role-Based Access Control (RBAC): Distinct authorization checks for regular users and administrative accounts.

Dynamic Event Catalog: Browse, view details, and query live events rendered directly on the server.

Event Registration Engine: Interactive modal-driven user event registration with dynamic field processing.

Admin Analytics & Reporting: Dedicated dashboard for administrative management, event creation, user activity reporting, and registration metrics.

Security & Data Integrity Features
Production-Grade Password Hashing: Salted one-way password hashing using bcrypt across all authentication endpoints.

Input Validation & Sanitization: Strict validation rules for names, email formatting, and demographic fields to prevent invalid submissions.

Post/Redirect/Get (PRG) Workflow: Clean form state handling via session flash messaging to eliminate modal bugs and duplicate form submissions on page refresh.

Relational Database Integrity: Foreign key constraints between users, events, and registration records with transactional cleanup support (TRUNCATE TABLE ... RESTART IDENTITY CASCADE).

Tech Stack
Backend: Node.js, Express.js

Database: PostgreSQL (pg module)

Templating Engine: EJS (Embedded JavaScript)

Security & Utilities: bcrypt (password hashing), express-session, dotenv

Installation & Setup
1. Clone the Repository
Bash
git clone https://github.com/YOUR_USERNAME/CodeAlpha_Tasks.git
cd CodeAlpha_Tasks/CodeAlpha_Event_Registration_System

npm install

Create a .env file in the root directory of the project:

Start server in development mode (using nodemon)
npm run dev

Start server in production mode
npm start