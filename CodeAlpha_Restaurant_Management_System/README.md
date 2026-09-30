Best Restaurant Management System

A restaurant management system built as part of the Code Alpha Backend Internship. It lets customers browse a food menu,
place orders, and reserve tables, while an admin can view live inventory and order activity — 
all backed by a PostgreSQL database with atomic, race-condition-safe stock updates.

FeaturesFeatures
 Customer
Authentication & Authorization: Secure signup, login, and logout using bcrypt password hashing and express-session.

Menu & Stock Browsing: Interactive grid displaying items with live inventory counts and real-time "Out of Stock" indicators.

Interactive Ordering: Dynamic per-item quantity selector (+/-) with client-side boundary checks and a modal confirmation flow.

Table Reservations: Instant booking system for distinct seating tiers (VIP, Gold, Platinum, etc.).

Booked Orders Dashboard: Centralized view of active food orders and table bookings with single-click order cancellation.

Automatic Stock Restoration: Canceling an order or reservation atomically restores the exact quantity back to the inventory database.

 Admin
Role-Based Access Control (RBAC): Middleware-gated routes ensuring only authenticated accounts with role = 'admin' access management dashboards.

Live Inventory Tracking: Monitor available stock, pricing, and active statuses across all food and drink items.

Reservation Monitoring: Track real-time slot availability for all table categories.

Unified Order Feed: Consolidated log displaying all user transactions sorted chronologically.

Tech Stack
Backend: Node.js, Express.js

Templating Engine: EJS

Database: PostgreSQL (pg pool connection management)

Authentication: express-session, bcrypt

Frontend: Vanilla JavaScript (Fetch API, DOM manipulation, Modals), Custom CSS Grid

Database Architecture
Table	Purpose
user_reg_table	Customer and admin account storage (role column gates privileges)
inventory_menu_table	Food and drink catalog (pricing, stock levels, status, image URLs)
available_reservation_table	Table seating tiers and booking availability
activity_registration_table	Unified transaction ledger linked via CHECK constraints
Key Engineering Decisions
Atomic Stock Updates: All inventory updates utilize atomic database operations (UPDATE ... SET quantity = quantity - $1 WHERE quantity >= $1) to guarantee concurrency safety and prevent check-then-write race conditions.

Transactional Integrity: Order placement and stock deduction execute within PostgreSQL transactions (BEGIN / COMMIT / ROLLBACK) to eliminate partial writes or desynchronized data.

Database Guardrails: PostgreSQL CHECK constraints strictly enforce non-negative stock values directly at the database layer.

Getting Started
Prerequisites
Node.js (v18+)

PostgreSQL (v14+)

Installation
Clone the repository:

Bash
git clone [https://github.com/your-username/restaurant-management-system.git]
cd restaurant-management-system
Install dependencies:

Bash
npm install
Configure Environment Variables:
Create a .env file in the root directory:

Code snippet
PG_USER=your_pg_user
PG_HOST=localhost
PG_DATABASE=restaurant_db
PG_PASSWORD=your_pg_password
PG_PORT=5432
SESSION_SECRET=your_super_secret_key
PORT=3000
Initialize Database Schema:
Run your SQL initialization script against your PostgreSQL instance:

Bash
psql -U your_pg_user -d restaurant_db -f schema.sql
Start the application:

Bash
node index.js
Navigate to http://localhost:3000 in your browser.

Roadmap / Planned Features
[x] Core ordering & table reservation engine

[x] Concurrency-safe PostgreSQL stock management

[x] Admin oversight dashboard

[ ] Daily sales analytics & revenue metrics

[ ] Automated low-stock email alerts for admins