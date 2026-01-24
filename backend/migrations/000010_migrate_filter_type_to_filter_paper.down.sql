-- Add back the filter_type column
ALTER TABLE experiments ADD COLUMN filter_type VARCHAR(50);

-- Populate from filter_papers
UPDATE experiments e
SET filter_type = fp.name
FROM filter_papers fp
WHERE fp.id = e.filter_paper_id;

-- Drop the FK column
DROP INDEX IF EXISTS idx_experiments_filter_paper_id;
ALTER TABLE experiments DROP COLUMN filter_paper_id;
