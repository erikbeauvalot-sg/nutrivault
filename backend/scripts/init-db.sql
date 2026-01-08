-- PostgreSQL Database Initialization Script
-- This script is automatically run when the PostgreSQL container starts for the first time

-- Create the database if it doesn't exist (note: the database is created by the container)
-- This script runs within the nutrivault database context

-- Enable UUID extension for potential future use
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON DATABASE nutrivault TO nutrivault_user;

-- Log completion
SELECT 'Database initialized successfully' AS status;
