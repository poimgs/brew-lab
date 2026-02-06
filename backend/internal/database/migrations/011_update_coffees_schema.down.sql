-- Add purchase_date back
ALTER TABLE coffees ADD COLUMN purchase_date DATE;

-- Rename farm back to region
ALTER TABLE coffees RENAME COLUMN farm TO region;
