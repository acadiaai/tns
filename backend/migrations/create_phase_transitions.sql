-- Create phase_transitions table to model brainspotting workflow
CREATE TABLE IF NOT EXISTS phase_transitions (
    id TEXT PRIMARY KEY,
    from_phase TEXT NOT NULL,
    to_phase TEXT NOT NULL,
    transition_type TEXT NOT NULL, -- 'required', 'optional', 'conditional', 'loop_back'
    condition_type TEXT, -- 'user_choice', 'activation_level', 'timer_complete', 'issue_selected'
    condition_data TEXT, -- JSON data for conditions
    priority INTEGER DEFAULT 0, -- For ordering multiple possible transitions
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_phase) REFERENCES phases(id),
    FOREIGN KEY (to_phase) REFERENCES phases(id),
    UNIQUE(from_phase, to_phase)
);

-- Define the core brainspotting workflow transitions
INSERT INTO phase_transitions (id, from_phase, to_phase, transition_type, condition_type, priority, description) VALUES
-- Linear progression through main phases
('pre_to_issue', 'pre_session', 'issue_decision', 'required', 'conversation_complete', 100, 'After initial conversation, move to issue selection'),
('issue_to_identify', 'issue_decision', 'identify_activate', 'required', 'issue_selected', 100, 'After selecting issue, activate it'),
('identify_to_setup', 'identify_activate', 'setup', 'required', 'activation_complete', 100, 'After activation, setup SUDS and location'),
('setup_to_mindfulness', 'setup', 'focused_mindfulness', 'required', 'setup_complete', 100, 'Begin mindfulness after setup'),
('mindfulness_to_status', 'focused_mindfulness', 'status_check', 'required', 'timer_complete', 100, 'Check status after mindfulness timer'),

-- Conditional transitions based on activation levels
('status_to_micro', 'status_check', 'micro_reprocessing', 'conditional', 'activation_level', 90, 'If activation remains > 5, do micro-reprocessing'),
('status_to_squeeze', 'status_check', 'squeeze_lemon', 'conditional', 'activation_level', 80, 'If activation 3-5, squeeze the lemon'),
('status_to_expansion', 'status_check', 'expansion', 'conditional', 'activation_level', 70, 'If activation < 3, move to expansion'),
('status_to_complete', 'status_check', 'complete', 'conditional', 'activation_level', 60, 'If activation 0, complete session'),

-- Loop-back transitions for continued processing (CORE THERAPEUTIC CYCLES)
('micro_to_mindfulness', 'micro_reprocessing', 'focused_mindfulness', 'required', 'continue_processing', 100, 'Return to mindfulness after micro-reprocessing'),
('micro_to_status', 'micro_reprocessing', 'status_check', 'optional', 'quick_check', 50, 'Quick status check after intervention'),
('squeeze_to_mindfulness', 'squeeze_lemon', 'focused_mindfulness', 'required', 'continue_processing', 100, 'Return to mindfulness after squeezing'),
('squeeze_to_status', 'squeeze_lemon', 'status_check', 'optional', 'quick_check', 50, 'Check progress after squeeze'),

-- Core cyclical patterns for deepening work
('mindfulness_to_mindfulness', 'focused_mindfulness', 'focused_mindfulness', 'optional', 'continue_processing', 40, 'Continue mindfulness if needed'),
('status_to_mindfulness', 'status_check', 'focused_mindfulness', 'conditional', 'activation_remains', 95, 'Continue processing if activation > 0'),

-- Multiple cycles through the same issue
('status_to_identify', 'status_check', 'identify_activate', 'optional', 'new_aspect', 30, 'Activate new aspect of same issue'),
('expansion_to_mindfulness', 'expansion', 'focused_mindfulness', 'optional', 'deepen_work', 40, 'Return to process expanded awareness'),
('expansion_to_status', 'expansion', 'status_check', 'optional', 'check_integration', 50, 'Check integration after expansion'),
('expansion_to_complete', 'expansion', 'complete', 'conditional', 'work_complete', 100, 'Complete after expansion work'),

-- Allow cycling back to earlier phases for new issues or aspects
('complete_to_issue', 'complete', 'issue_decision', 'optional', 'new_issue', 20, 'Start new issue in same session'),
('status_to_setup', 'status_check', 'setup', 'optional', 'adjust_setup', 20, 'Adjust SUDS or position if needed');

-- Add condition data for specific transitions
UPDATE phase_transitions
SET condition_data = json_object(
    'min_turns', 3,
    'keywords', json_array('ready', 'start', 'begin', 'yes', 'let''s do it')
)
WHERE id = 'pre_to_issue';

UPDATE phase_transitions
SET condition_data = json_object(
    'min_activation', 6,
    'action', 'micro_reprocess'
)
WHERE id = 'status_to_micro';

UPDATE phase_transitions
SET condition_data = json_object(
    'min_activation', 3,
    'max_activation', 5,
    'action', 'squeeze'
)
WHERE id = 'status_to_squeeze';

UPDATE phase_transitions
SET condition_data = json_object(
    'max_activation', 2,
    'action', 'expand'
)
WHERE id = 'status_to_expansion';

UPDATE phase_transitions
SET condition_data = json_object(
    'max_activation', 0,
    'action', 'complete'
)
WHERE id = 'status_to_complete';

-- Add condition data for cyclical transitions
UPDATE phase_transitions
SET condition_data = json_object(
    'min_cycles', 1,
    'max_cycles', 10,
    'preferred_duration', 180,
    'activation_threshold', 1
)
WHERE id = 'status_to_mindfulness';

UPDATE phase_transitions
SET condition_data = json_object(
    'trigger', 'new_memory_or_aspect',
    'activation_increase', true
)
WHERE id = 'status_to_identify';

UPDATE phase_transitions
SET condition_data = json_object(
    'min_duration', 60,
    'max_duration', 300,
    'check_interval', 60
)
WHERE id IN ('micro_to_mindfulness', 'squeeze_to_mindfulness');

-- Create index for efficient lookups
CREATE INDEX idx_phase_transitions_from ON phase_transitions(from_phase);
CREATE INDEX idx_phase_transitions_to ON phase_transitions(to_phase);
CREATE INDEX idx_phase_transitions_priority ON phase_transitions(from_phase, priority DESC);