/*
  # Update schema for service types and photos

  1. Changes
    - Update suppliers table to use service_types array instead of service_type
    - Add service_types array to maintenance_requests table
    - Update existing data to use arrays

  2. Data Migration
    - Convert existing service_type strings to arrays
    - Set default empty arrays where needed
*/

-- Update suppliers table
ALTER TABLE suppliers 
ADD COLUMN service_types text[] DEFAULT '{}';

-- Migrate existing data
UPDATE suppliers 
SET service_types = ARRAY[service_type] 
WHERE service_type IS NOT NULL AND service_type != '';

-- Drop old column
ALTER TABLE suppliers 
DROP COLUMN service_type;

-- Make service_types not null
ALTER TABLE suppliers 
ALTER COLUMN service_types SET NOT NULL;

-- Update maintenance_requests table
ALTER TABLE maintenance_requests 
ADD COLUMN service_types text[] DEFAULT '{}';

-- Make service_types not null
ALTER TABLE maintenance_requests 
ALTER COLUMN service_types SET NOT NULL;