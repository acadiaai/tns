-- Create Realistic Data Setup: 2 Therapists, 4 Patients, Multiple Sessions

-- Clear existing data
DELETE FROM messages;
DELETE FROM sessions;
DELETE FROM clients;
DELETE FROM therapists;

-- Create 2 Therapists
INSERT INTO therapists (id, name, specialty, email, phone, license_number, years_experience, bio, created_at, updated_at) VALUES
('dr-sarah-chen', 'Dr. Sarah Chen', 'Anxiety & Depression', 'sarah.chen@therapy.com', '555-0101', 'LIC123456', 8, 'Specializes in CBT and mindfulness-based approaches for anxiety and depression.', datetime('now'), datetime('now')),
('dr-marcus-thompson', 'Dr. Marcus Thompson', 'Trauma & PTSD', 'marcus.thompson@therapy.com', '555-0102', 'LIC234567', 12, 'Expert in trauma-informed care and EMDR therapy for PTSD recovery.', datetime('now'), datetime('now'));

-- Create 4 Patients (2 for each therapist)
INSERT INTO clients (id, name, email, phone, date_of_birth, background_info, presenting_concerns, intake_complete, age, created_at, updated_at) VALUES
-- Dr. Sarah Chen's patients (anxiety/depression focus)
('jessica-miller', 'Jessica Miller', 'jessica.miller@email.com', '555-0201', '1992-03-15', 'Software engineer experiencing work-related stress and anxiety', 'Work stress, sleep issues, anxiety attacks', false, 31, datetime('now'), datetime('now')),
('maria-santos', 'Maria Santos', 'maria.santos@email.com', '555-0203', '1995-11-08', 'Graduate student with perfectionism and social anxiety', 'Social anxiety, perfectionism, academic pressure', false, 28, datetime('now'), datetime('now')),

-- Dr. Marcus Thompson's patients (trauma/PTSD focus)
('alex-kim', 'Alex Kim', 'alex.kim@email.com', '555-0204', '1990-05-18', 'Military veteran dealing with PTSD and adjustment issues', 'PTSD, nightmares, anger management', false, 33, datetime('now'), datetime('now')),
('david-park', 'David Park', 'david.park@email.com', '555-0202', '1988-07-22', 'Recent divorce, struggling with depression and isolation', 'Depression, loneliness, major life transition', false, 35, datetime('now'), datetime('now'));

-- Create Sessions - Each therapist has multiple sessions with their patients
INSERT INTO sessions (id, client_id, therapist_id, status, phase, start_time, current_stage, completion_percentage, conversation_turns, simulation_mode, created_at, updated_at) VALUES
-- Dr. Sarah Chen with Jessica Miller
('session-sarah-jessica-1', 'jessica-miller', 'dr-sarah-chen', 'active', 'intake', datetime('now', '-2 days'), 1, 25, 10, false, datetime('now'), datetime('now')),
('session-sarah-jessica-2', 'jessica-miller', 'dr-sarah-chen', 'completed', 'setup', datetime('now', '-5 days'), 2, 100, 10, false, datetime('now'), datetime('now')),

-- Dr. Sarah Chen with Maria Santos  
('session-sarah-maria-1', 'maria-santos', 'dr-sarah-chen', 'active', 'intake', datetime('now', '-1 day'), 1, 60, 10, false, datetime('now'), datetime('now')),
('session-sarah-maria-2', 'maria-santos', 'dr-sarah-chen', 'scheduled', 'intake', datetime('now', '+1 day'), 1, 0, 10, false, datetime('now'), datetime('now')),

-- Dr. Marcus Thompson with Alex Kim
('session-marcus-alex-1', 'alex-kim', 'dr-marcus-thompson', 'active', 'treatment', datetime('now', '-3 days'), 3, 75, 10, false, datetime('now'), datetime('now')),
('session-marcus-alex-2', 'alex-kim', 'dr-marcus-thompson', 'paused', 'setup', datetime('now', '-7 days'), 2, 50, 10, false, datetime('now'), datetime('now')),

-- Dr. Marcus Thompson with David Park
('session-marcus-david-1', 'david-park', 'dr-marcus-thompson', 'active', 'intake', datetime('now'), 1, 10, 10, false, datetime('now'), datetime('now')),
('session-marcus-david-2', 'david-park', 'dr-marcus-thompson', 'scheduled', 'intake', datetime('now', '+2 days'), 1, 0, 10, false, datetime('now'), datetime('now'));