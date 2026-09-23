-- 1. Create Users Table
CREATE TABLE urlshortener ( 
	id serial PRIMARY KEY,
	long_url text UNIQUE NOT NULL,
	short_code VARCHAR(10) UNIQUE
)