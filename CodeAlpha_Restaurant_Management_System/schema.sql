--to store User Accounts (Customers & Admins)
CREATE TABLE user_reg_table (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    acct_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- this is for Food & Drink Inventory Catalog
CREATE TABLE inventory_menu_table (
    id SERIAL PRIMARY KEY,
    inventory_name VARCHAR(150) UNIQUE NOT NULL,
    inventory_quantity INTEGER NOT NULL CHECK (inventory_quantity >= 0),
    inventory_price NUMERIC(10, 2) NOT NULL,
    inventory_status VARCHAR(50) DEFAULT 'instock'
);

-- available Table Reservation Catalog
CREATE TABLE available_reservation_table (
    id SERIAL PRIMARY KEY,
    reservation_name VARCHAR(150) UNIQUE NOT NULL, 
    reservation_quantity INTEGER NOT NULL CHECK (reservation_quantity >= 0), 
    reservation_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reservation_status VARCHAR(50) DEFAULT 'available'
);

-- central transaction record table
CREATE TABLE activity_registration_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user_reg_table(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES inventory_table(id) ON DELETE CASCADE,
    reservation_id INTEGER REFERENCES available_reservation_table(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('FOOD_ORDER', 'TABLE_RESERVATION')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    booked_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_activity_target CHECK (
        (activity_type = 'FOOD_ORDER' AND inventory_id IS NOT NULL AND reservation_id IS NULL) OR
        (activity_type = 'TABLE_RESERVATION' AND reservation_id IS NOT NULL AND inventory_id IS NULL)
    )
);