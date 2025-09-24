-- SQLite migration to add detail_source and workflow_phase fields to issue_details table

-- Add detail_source column with default value
ALTER TABLE issue_details ADD COLUMN detail_source VARCHAR(20) DEFAULT 'exploratory';

-- Add workflow_phase column to track which phase the detail was discovered in
ALTER TABLE issue_details ADD COLUMN workflow_phase VARCHAR(50);

-- Create index on detail_source for faster filtering
CREATE INDEX IF NOT EXISTS idx_issue_details_detail_source ON issue_details(detail_source);

-- Create index on workflow_phase for analytics
CREATE INDEX IF NOT EXISTS idx_issue_details_workflow_phase ON issue_details(workflow_phase);