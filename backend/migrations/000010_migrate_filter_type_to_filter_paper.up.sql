-- Create filter_papers from existing experiment data
INSERT INTO filter_papers (user_id, name)
SELECT DISTINCT e.user_id, e.filter_type
FROM experiments e
WHERE e.filter_type IS NOT NULL AND e.filter_type != ''
ON CONFLICT (user_id, name) DO NOTHING;

-- Add FK column
ALTER TABLE experiments ADD COLUMN filter_paper_id UUID REFERENCES filter_papers(id) ON DELETE SET NULL;

-- Populate FK from existing filter_type values
UPDATE experiments e
SET filter_paper_id = fp.id
FROM filter_papers fp
WHERE fp.user_id = e.user_id AND fp.name = e.filter_type;

-- Drop old column
ALTER TABLE experiments DROP COLUMN filter_type;

-- Create index
CREATE INDEX idx_experiments_filter_paper_id ON experiments(filter_paper_id);
