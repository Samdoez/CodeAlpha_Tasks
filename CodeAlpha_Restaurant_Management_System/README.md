Best Restaurant Management System

A restaurant management system built as part of the Code Alpha Backend Internship. It lets customers browse a food menu,
place orders, and reserve tables, while an admin can view live inventory and order activity — 
all backed by a PostgreSQL database with atomic, race-condition-safe stock updates.

Features
Customer
    Account system — signup, login, logout with hashed passwords (bcrypt) and session-based auth (express-session).
    Menu browsing — food items displayed in a responsive card grid, each with an image, price, and live stock count.
    Ordering — per-item quantity picker (+/-), a confirmation modal showing the item, quantity, and calculated total before submitting.
    Table reservations — same card grid and confirmation flow, applied to table types (VIP, Bronze, Gold, Platinum, etc.).
    Booked orders page — a single table listing all of a user's food orders and table reservations, each deletable with a confirmation modal. Deleting an order or reservation automatically restores the item's stock.
    Live inventory sync — every order or reservation atomically decrements the relevant stock count in the database; items automatically flip to "out of stock" when they hit zero, and back to available stock is restored.

Admin
    Role-based access — a role column on the user table gates all admin routes; only accounts with role = 'admin' can reach the admin dashboard.
    Menu inventory view — current stock, price, and status for every menu item.
    Reservation inventory view — current slot counts and status for every table type.
    All orders view — every user's food orders and table reservations in one combined table, newest first.

Tech Stack
    Backend: Node.js, Express
    Views: EJS
    Database: PostgreSQL (via pg, connection pooling with pg.Pool)
    Auth: express-session, bcrypt
    Frontend: Vanilla JS (modals, quantity pickers, fetch-based order/reservation submission), custom CSS (CSS Grid for the menu layout)

Database Design
Table	          Purpose
user_reg_table	Customer and admin accounts (role column distinguishes them)
inventory_menu_table	Food/drink menu items — name, price, quantity, status, image
available_reservation_table	Table/reservation types — name, price, quantity, status, image
activity_registration_table	Unified log of every food order and table reservation, linked to whichever source table applies via a CHECK constraint

Key design decisions:

Atomic stock updates. Every stock change (order, reservation, cancellation) uses a single UPDATE ... WHERE quantity >= $1 RETURNING ... statement, so a check-then-update race condition between two simultaneous requests is impossible — the database guarantees the check and the decrement happen as one step.
Transactions for multi-table writes. Placing an order touches two tables (decrementing stock, inserting the activity record); both happen inside a single BEGIN / COMMIT transaction, with ROLLBACK on any failure, so the two writes can never get out of sync.
CHECK constraints as a second safety net. Beyond application-level validation, the database itself rejects negative stock and enforces that every activity log row is either a food order or a table reservation, never both or neither.

Project Structure (high-level)
/public          → static assets (CSS, images)
/views           → EJS templates (dashboard, menu, reservations, booked orders, admin views)
index.js         → Express app, routes, and DB queries

Getting Started
Clone the repo and install dependencies:
bash
   npm install
   
Set up a .env file with your PostgreSQL credentials:
   PG_USER=your_pg_user
   PG_HOST=localhost
   PG_DATABASE=your_db_name
   PG_PASSWORD=your_pg_password
   PG_PORT=5432
   SESSION_SECRET=your_session_secret

Run the schema and seed scripts against your database to create the tables and initial menu/reservation data.

Start the server:
bash
   node index.js
Visit http://localhost:3000 in your browser.
Status

Actively being built as part of the Code Alpha internship. Core ordering, reservation, and admin-viewing flows are functional. Planned/optional additions include daily sales reporting and low-stock alerts for the admin dashboard.