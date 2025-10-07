# Baseline E2E Test Script

Realistic patient responses for regression testing. Use this exact script for consistent e2e tests.

## Purpose
This script simulates a realistic brainspotting therapy session with natural patient dialogue. It exercises all major phase transitions without using synthetic/technical data that a real patient would never say.

## Key Principles
- Patient provides data ONLY when asked
- Patient uses casual, natural language
- Patient never volunteers future-phase technical data (e.g., eye positions before being guided)
- AI must guide the process step-by-step

---

## Phase 1: Pre-Session

**AI:** Hello! Welcome back. How are you doing today?

**Patient:** I'm okay, a bit nervous but ready.

**AI:** Before we begin, I need to confirm your consent to proceed with today's session. Do you consent?

**Patient:** Yes, I consent.

*Expected: AI collects consent_given: true, auto-transitions to stage_1_deciding_issue*

---

## Phase 2: Deciding Issue

**AI:** What troubles you today?

**Patient:** I've been really stressed about work lately. It's been overwhelming.

**AI:** Can you rate how intense this feels right now on a scale of 0 to 10?

**Patient:** Maybe like an 8 out of 10.

*Expected: AI collects selected_issue: "work stress", issue_intensity: 8, auto-transitions to stage_2_information_gathering*

---

## Phase 3: Information Gathering

**AI:** When did this feeling of overwhelm at work start for you?

**Patient:** It started about 6 months ago when I got this new project. I keep feeling like I'm not good enough.

**AI:** On a scale of 0 to 10, how distressing is this feeling right now?

**Patient:** Still an 8.

*Expected: AI collects history: "6 months ago", negative_cognition: "not good enough", suds_level: 8, auto-transitions to stage_3_activating_setup*

---

## Phase 4: Activating & Setup

**AI:** Where do you feel this stress in your body right now?

**Patient:** In my chest, it feels tight and heavy.

**AI:** On a scale of 0 to 10, how strong is that sensation in your chest?

**Patient:** About an 8.

**AI:** I'm going to guide you to find an eye position. As you think about the work stress, slowly move your eyes left and right. Notice where the feeling in your chest gets stronger.

**Patient:** When I look slightly to the left and up, it feels stronger.

**AI:** Can you stay there for a moment? Notice how it feels.

**Patient:** Yeah, it's definitely stronger here.

*Expected: AI collects body_location: "chest", sensation_quality: "tight and heavy", activation_level: 8, brainspot_x: -0.3 (approximate from "left"), brainspot_y: 0.2 (approximate from "up"), auto-transitions to stage_4_focused_mindfulness*

---

## Phase 5: Focused Mindfulness (Timed Wait)

**AI:** Perfect. Now I'd like you to stay with that spot and just notice whatever comes up. There's no need to analyze or change anything - just observe. I'll be here with you.

*Expected: AI enters timed wait state, timer starts, session pauses for processing time*

**Patient:** [After timer completes or patient indicates readiness] I noticed the tightness started to ease a bit. Some memories from that first project meeting came up.

**AI:** What did you notice about those memories?

**Patient:** I remembered my boss's face when I presented. I felt like I was being judged.

*Expected: AI collects processing_observations, auto-transitions to stage_5_checking_in*

---

## Phase 6: Checking In

**AI:** Thank you for sharing that. On a scale of 0 to 10, where is your distress level now?

**Patient:** It's down to about a 5.

**AI:** Would you like to continue processing this, or does it feel complete for now?

**Patient:** I think I'd like to continue, there's still some tension.

*Expected: AI collects current_suds: 5, next_action: "continue", routes back to focused_mindfulness or to micro_reprocessing if needed*

---

## Test Validation Criteria

### ✅ Success Criteria
1. AI NEVER announces tool calls ("I'm going to collect...", "Let me gather...")
2. All phase transitions occur automatically when requirements met
3. AI guides patient through eye position finding (doesn't expect patient to volunteer coordinates)
4. Data collected matches natural patient language
5. Session progresses smoothly through all phases

### ❌ Failure Indicators
1. AI says "I'm going to collect/gather/record that information"
2. AI expects patient to volunteer technical data (coordinates, field names)
3. Phases don't auto-transition when requirements are met
4. AI re-asks for data already provided
5. AI extracts data from Working Memory that belongs to future phases

---

## Notes for Testers

- This script represents ONE realistic session path
- Patient responses are intentionally casual ("maybe like an 8")
- Eye position is described directionally ("left and up"), not as coordinates
- AI must translate directional descriptions to approximate coordinates
- Some phases (like squeeze lemon, expansion) may not be reached in shorter sessions
- Focus on testing core data collection and transition mechanics first
