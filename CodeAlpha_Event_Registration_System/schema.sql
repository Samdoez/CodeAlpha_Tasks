-- 1. Create Users Table
CREATE TABLE user_reg (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    acct_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Event Details Table
CREATE TABLE event_details (
    event_id SERIAL PRIMARY KEY,
    event_name TEXT UNIQUE NOT NULL,
    event_date TIMESTAMP NOT NULL,
    event_location TEXT NOT NULL,
    event_capacity INTEGER NOT NULL DEFAULT 100
);

-- 3. Create Registrations Table
CREATE TABLE registration (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_reg(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES event_details(event_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    event_reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevents a user from registering for the same event more than once
    UNIQUE (user_id, event_id)
);