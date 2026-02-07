ALTER TABLE brews ADD COLUMN roast_date DATE;
UPDATE brews b SET roast_date = c.roast_date
  FROM coffees c WHERE b.coffee_id = c.id AND c.roast_date IS NOT NULL;
