-- Migration 002: Add transition type and priority fields to phase_transitions table
-- This migration adds fields needed for proper workflow modeling

-- Add new columns for transition rules
ALTER TABLE phase_transitions ADD COLUMN transition_type TEXT DEFAULT 'required';
ALTER TABLE phase_transitions ADD COLUMN condition_type TEXT;
ALTER TABLE phase_transitions ADD COLUMN priority INTEGER DEFAULT 0;

-- Clear existing data to start fresh with proper workflow
DELETE FROM phase_transitions;

-- Insert the core brainspotting workflow transitions
INSERT INTO phase_transitions (id, from_phase_id, to_phase_id, transition_type, condition_type, priority, description, rules) VALUES
-- Linear progression through main phases
('pre_to_issue', 'pre_session', 'issue_decision', 'required', 'conversation_complete', 100, 'After initial conversation, move to issue selection',
 '{"min_turns": 3, "keywords": ["ready", "start", "begin", "yes", "lets do it"]}'),

('issue_to_identify', 'issue_decision', 'identify_activate', 'required', 'issue_selected', 100, 'After selecting issue, activate it',
 '{"requires_issue": true}'),

('identify_to_setup', 'identify_activate', 'setup', 'required', 'activation_complete', 100, 'After activation, setup SUDS and location',
 '{"requires_activation": true, "min_activation": 1}'),

('setup_to_mindfulness', 'setup', 'focused_mindfulness', 'required', 'setup_complete', 100, 'Begin mindfulness after setup',
 '{"requires_suds": true, "requires_location": true, "requires_eye_position": true}'),

('mindfulness_to_status', 'focused_mindfulness', 'status_check', 'required', 'timer_complete', 100, 'Check status after mindfulness timer',
 '{"min_duration": 60, "preferred_duration": 180}'),

-- Conditional transitions based on activation levels
('status_to_micro', 'status_check', 'micro_reprocessing', 'conditional', 'activation_level', 90, 'If activation remains > 5, do micro-reprocessing',
 '{"min_activation": 6, "action": "micro_reprocess"}'),

('status_to_squeeze', 'status_check', 'squeeze_lemon', 'conditional', 'activation_level', 80, 'If activation 3-5, squeeze the lemon',
 '{"min_activation": 3, "max_activation": 5, "action": "squeeze"}'),

('status_to_expansion', 'status_check', 'expansion', 'conditional', 'activation_level', 70, 'If activation < 3, move to expansion',
 '{"max_activation": 2, "action": "expand"}'),

('status_to_complete', 'status_check', 'complete', 'conditional', 'activation_level', 60, 'If activation 0, complete session',
 '{"max_activation": 0, "action": "complete"}'),

-- Loop-back transitions for continued processing (CORE THERAPEUTIC CYCLES)
('micro_to_mindfulness', 'micro_reprocessing', 'focused_mindfulness', 'required', 'continue_processing', 100, 'Return to mindfulness after micro-reprocessing',
 '{"min_duration": 60, "max_duration": 300, "check_interval": 60}'),

('micro_to_status', 'micro_reprocessing', 'status_check', 'optional', 'quick_check', 50, 'Quick status check after intervention',
 '{"quick_check": true}'),

('squeeze_to_mindfulness', 'squeeze_lemon', 'focused_mindfulness', 'required', 'continue_processing', 100, 'Return to mindfulness after squeezing',
 '{"min_duration": 60, "max_duration": 300, "check_interval": 60}'),

('squeeze_to_status', 'squeeze_lemon', 'status_check', 'optional', 'quick_check', 50, 'Check progress after squeeze',
 '{"quick_check": true}'),

-- Core cyclical patterns for deepening work
('mindfulness_to_mindfulness', 'focused_mindfulness', 'focused_mindfulness', 'optional', 'continue_processing', 40, 'Continue mindfulness if needed',
 '{"allow_extension": true}'),

('status_to_mindfulness', 'status_check', 'focused_mindfulness', 'conditional', 'activation_remains', 95, 'Continue processing if activation > 0',
 '{"min_cycles": 1, "max_cycles": 10, "preferred_duration": 180, "activation_threshold": 1}'),

-- Multiple cycles through the same issue
('status_to_identify', 'status_check', 'identify_activate', 'optional', 'new_aspect', 30, 'Activate new aspect of same issue',
 '{"trigger": "new_memory_or_aspect", "activation_increase": true}'),

('expansion_to_mindfulness', 'expansion', 'focused_mindfulness', 'optional', 'deepen_work', 40, 'Return to process expanded awareness',
 '{"deepen": true}'),

('expansion_to_status', 'expansion', 'status_check', 'optional', 'check_integration', 50, 'Check integration after expansion',
 '{"check_integration": true}'),

('expansion_to_complete', 'expansion', 'complete', 'conditional', 'work_complete', 100, 'Complete after expansion work',
 '{"work_complete": true}'),

-- Allow cycling back to earlier phases for new issues or aspects
('complete_to_issue', 'complete', 'issue_decision', 'optional', 'new_issue', 20, 'Start new issue in same session',
 '{"allow_multiple_issues": true}'),

('status_to_setup', 'status_check', 'setup', 'optional', 'adjust_setup', 20, 'Adjust SUDS or position if needed',
 '{"allow_adjustment": true}');

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_phase_transitions_from ON phase_transitions(from_phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_transitions_to ON phase_transitions(to_phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_transitions_priority ON phase_transitions(from_phase_id, priority DESC);