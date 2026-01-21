CREATE TABLE experiment_tags (
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES issue_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (experiment_id, tag_id)
);

CREATE INDEX idx_experiment_tags_tag_id ON experiment_tags(tag_id);
