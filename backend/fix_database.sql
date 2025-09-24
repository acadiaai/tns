-- Fix Database with Real Data

-- First, clear existing data
DELETE FROM messages;
DELETE FROM sessions;
DELETE FROM clients;
DELETE FROM therapists;

-- Create Real Therapists
INSERT INTO therapists (id, name, specialty, email, phone, license_number, years_experience, bio, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Chen', 'Anxiety & Depression', 'sarah.chen@therapy.com', '555-0101', 'LIC123456', 8, 'Specializes in CBT and mindfulness-based approaches for anxiety and depression.', datetime('now'), datetime('now')),
('22222222-2222-2222-2222-222222222222', 'Dr. Marcus Thompson', 'Trauma & PTSD', 'marcus.thompson@therapy.com', '555-0102', 'LIC234567', 12, 'Expert in trauma-informed care and EMDR therapy for PTSD recovery.', datetime('now'), datetime('now')),
('33333333-3333-3333-3333-333333333333', 'Dr. Emily Rodriguez', 'Relationship Counseling', 'emily.rodriguez@therapy.com', '555-0103', 'LIC345678', 6, 'Focuses on couples therapy and family dynamics using EFT approaches.', datetime('now'), datetime('now'));

-- Create Real Patients
INSERT INTO clients (id, name, email, phone, date_of_birth, background_info, presenting_concerns, intake_complete, age, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jessica Miller', 'jessica.miller@email.com', '555-0201', '1992-03-15', 'Software engineer experiencing work-related stress and anxiety', 'Work stress, sleep issues, anxiety attacks', false, 31, datetime('now'), datetime('now')),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'David Park', 'david.park@email.com', '555-0202', '1988-07-22', 'Recent divorce, struggling with depression and isolation', 'Depression, loneliness, major life transition', false, 35, datetime('now'), datetime('now')),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Maria Santos', 'maria.santos@email.com', '555-0203', '1995-11-08', 'Graduate student with perfectionism and social anxiety', 'Social anxiety, perfectionism, academic pressure', false, 28, datetime('now'), datetime('now')),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Alex Kim', 'alex.kim@email.com', '555-0204', '1990-05-18', 'Military veteran dealing with PTSD and adjustment issues', 'PTSD, nightmares, anger management', false, 33, datetime('now'), datetime('now')),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Rachel & Tom Brown', 'rachel.brown@email.com', '555-0205', '1987-09-12', 'Married couple working through communication issues', 'Communication problems, intimacy issues, parenting stress', false, 36, datetime('now'), datetime('now'));

-- Create Real Sessions with proper therapist-patient pairings
INSERT INTO sessions (id, client_id, therapist_id, status, phase, start_time, current_stage, completion_percentage, conversation_turns, simulation_mode, created_at, updated_at) VALUES
-- Dr. Sarah Chen (Anxiety) with anxiety patients
('session01-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', 'intake', datetime('now'), 1, 15, 10, false, datetime('now'), datetime('now')),
('session02-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'active', 'intake', datetime('now'), 1, 30, 10, false, datetime('now'), datetime('now')),

-- Dr. Marcus Thompson (Trauma) with trauma patients  
('session03-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'active', 'intake', datetime('now'), 1, 45, 10, false, datetime('now'), datetime('now')),
('session04-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'scheduled', 'intake', datetime('now'), 1, 0, 10, false, datetime('now'), datetime('now')),

-- Dr. Emily Rodriguez (Relationships) with couples
('session05-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'active', 'setup', datetime('now'), 2, 80, 10, false, datetime('now'), datetime('now'));