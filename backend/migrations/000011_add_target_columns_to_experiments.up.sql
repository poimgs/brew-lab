ALTER TABLE experiments ADD COLUMN target_acidity INTEGER CHECK (target_acidity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_sweetness INTEGER CHECK (target_sweetness BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_bitterness INTEGER CHECK (target_bitterness BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_body INTEGER CHECK (target_body BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN target_aroma INTEGER CHECK (target_aroma BETWEEN 1 AND 10);
