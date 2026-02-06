-- Rename region to farm
ALTER TABLE coffees RENAME COLUMN region TO farm;

-- Drop purchase_date column
ALTER TABLE coffees DROP COLUMN purchase_date;
