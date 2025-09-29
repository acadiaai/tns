# Therapy Navigation System - Workflow Creation Guide

## 🎯 Overview
Create custom therapeutic workflows compatible with our AI-powered navigation system. This guide will help you design structured therapy sessions with automatic phase transitions, data collection, and interactive elements.

## 🏗️ System Architecture

Our system uses a **phase-based state machine** where:
- Each phase represents a distinct stage of the therapeutic process
- Phases can be **conversational** (interactive dialogue) or **timed_waiting** (mindfulness/reflection periods)
- AI coach guides clients through phases automatically
- Data is collected and validated at each phase
- Transitions occur when phase requirements are met

## 📋 Workflow Components

### 1. Phase Definition
Each phase must include:

```json
{
  "id": "unique_phase_id",
  "display_name": "Human Readable Name",
  "description": "What happens in this phase",
  "position": 1,  // Order in workflow (1, 2, 3...)
  "type": "conversational",  // or "timed_waiting"
  "minimum_turns": 2,  // Min conversation exchanges needed
  "recommended_duration_seconds": 180,
  "icon": "Target",  // Lucide icon name
  "color": "#4CAF50",  // Hex color for UI

  // For timed_waiting phases only:
  "wait_duration_seconds": 180,
  "visualization_type": "breathing_circle",  // Options below
  "pre_wait_message": "Message shown before timer starts",
  "post_wait_prompt": "Question asked after timer completes"
}
```

### 2. Phase Data Requirements
Define what information must be collected in each phase:

```json
{
  "phase_id": "phase_name",
  "fields": [
    {
      "name": "field_name",
      "required": true,
      "type": "string",  // string, integer, boolean, array
      "description": "What this field captures",
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500,
        "enum": ["option1", "option2"],  // For limited choices
        "pattern": "^[A-Za-z]+$"  // Regex validation
      }
    }
  ]
}
```

### 3. Phase Transitions
Define allowed paths between phases:

```json
{
  "from_phase": "phase_1",
  "to_phase": "phase_2",
  "condition": "all_required_fields_collected",  // Optional condition
  "priority": 1  // Higher priority transitions checked first
}
```

### 4. AI Prompts
Guide the AI coach's behavior in each phase:

```json
{
  "phase_id": "phase_name",
  "prompt": "You are guiding the client through [phase description]. Focus on:\n- Key point 1\n- Key point 2\n\nAsk about: [specific topics]\nCollect: [required data]\nMaintain: [therapeutic stance]"
}
```

## 🎨 Visualization Types for Timed Phases

- `breathing_circle` - Expanding/contracting circle for breath work
- `ocean_waves` - Calming wave animations
- `forest_sounds` - Green forest ambiance
- `mountain_view` - Static mountain vista
- `starfield` - Twinkling stars
- `minimal` - Simple gradient background

## 📝 Complete Workflow Template

```json
{
  "workflow_name": "Your Therapy Protocol",
  "version": "1.0.0",
  "description": "Brief description of the therapeutic approach",
  "total_duration_minutes": 50,

  "phases": [
    {
      "id": "intake",
      "display_name": "Initial Assessment",
      "description": "Understand client's current state",
      "position": 1,
      "type": "conversational",
      "minimum_turns": 3,
      "recommended_duration_seconds": 300,
      "icon": "Clipboard",
      "color": "#9E9E9E",
      "required_data": [
        {
          "name": "presenting_issue",
          "type": "string",
          "required": true,
          "description": "What brings you here today?"
        },
        {
          "name": "severity",
          "type": "integer",
          "required": true,
          "description": "Rate severity 1-10",
          "min": 1,
          "max": 10
        }
      ],
      "ai_prompt": "Warmly greet the client and explore their presenting issue with empathy and curiosity."
    },

    {
      "id": "reflection",
      "display_name": "Mindful Reflection",
      "description": "Pause to process insights",
      "position": 2,
      "type": "timed_waiting",
      "wait_duration_seconds": 120,
      "visualization_type": "breathing_circle",
      "pre_wait_message": "Let's take a moment to reflect on what you've shared.",
      "post_wait_prompt": "What came up for you during that pause?",
      "icon": "Brain",
      "color": "#2196F3"
    }
  ],

  "transitions": [
    {
      "from_phase": "intake",
      "to_phase": "reflection",
      "condition": "presenting_issue AND severity collected"
    },
    {
      "from_phase": "reflection",
      "to_phase": "intervention",
      "condition": "automatic_after_timer"
    }
  ],

  "tools": [
    {
      "name": "collect_structured_data",
      "available_in_phases": ["intake", "assessment"],
      "description": "Collects and validates required phase data"
    }
  ]
}
```

## 🔄 Workflow Examples

### Example 1: CBT Session
```json
{
  "workflow_name": "Cognitive Behavioral Therapy Session",
  "phases": [
    {
      "id": "thought_identification",
      "display_name": "Identify Automatic Thoughts",
      "type": "conversational",
      "minimum_turns": 4,
      "required_data": [
        {"name": "automatic_thought", "type": "string"},
        {"name": "emotion", "type": "string"},
        {"name": "intensity", "type": "integer", "min": 1, "max": 10}
      ]
    },
    {
      "id": "evidence_analysis",
      "display_name": "Examine Evidence",
      "type": "conversational",
      "required_data": [
        {"name": "evidence_for", "type": "array"},
        {"name": "evidence_against", "type": "array"}
      ]
    },
    {
      "id": "reframe",
      "display_name": "Develop Balanced Thought",
      "type": "conversational",
      "required_data": [
        {"name": "balanced_thought", "type": "string"},
        {"name": "new_emotion_intensity", "type": "integer"}
      ]
    }
  ]
}
```

### Example 2: Mindfulness-Based Stress Reduction
```json
{
  "workflow_name": "MBSR Session",
  "phases": [
    {
      "id": "check_in",
      "display_name": "Present Moment Check-in",
      "type": "conversational",
      "minimum_turns": 2
    },
    {
      "id": "body_scan",
      "display_name": "Body Scan Meditation",
      "type": "timed_waiting",
      "wait_duration_seconds": 600,
      "visualization_type": "minimal",
      "pre_wait_message": "We'll now do a 10-minute body scan. Find a comfortable position."
    },
    {
      "id": "reflection",
      "display_name": "Post-Meditation Reflection",
      "type": "conversational",
      "required_data": [
        {"name": "observations", "type": "string"},
        {"name": "body_sensations", "type": "array"}
      ]
    }
  ]
}
```

### Example 3: Solution-Focused Brief Therapy
```json
{
  "workflow_name": "SFBT Session",
  "phases": [
    {
      "id": "miracle_question",
      "display_name": "The Miracle Question",
      "type": "conversational",
      "required_data": [
        {"name": "miracle_scenario", "type": "string"},
        {"name": "first_signs", "type": "array"}
      ],
      "ai_prompt": "Ask: 'If a miracle happened overnight and your problem was solved, what would be different tomorrow?'"
    },
    {
      "id": "scaling",
      "display_name": "Scaling Questions",
      "type": "conversational",
      "required_data": [
        {"name": "current_scale", "type": "integer", "min": 1, "max": 10},
        {"name": "one_point_higher", "type": "string"}
      ]
    },
    {
      "id": "exceptions",
      "display_name": "Finding Exceptions",
      "type": "conversational",
      "required_data": [
        {"name": "times_better", "type": "array"},
        {"name": "what_was_different", "type": "string"}
      ]
    }
  ]
}
```

## ✅ Validation Rules

1. **Phase IDs** must be unique, lowercase, with underscores (e.g., `initial_assessment`)
2. **Position** values must be sequential (1, 2, 3...)
3. **Colors** must be valid hex codes
4. **Icons** must be valid Lucide icon names
5. **Required fields** must have clear descriptions
6. **Transitions** must connect existing phases
7. **Timed phases** must have wait_duration_seconds
8. **Field types** must be: string, integer, boolean, or array

## 🚀 Submission Format

Send your workflow as a JSON file with:
- Clear phase progression
- Required data fields defined
- AI prompts for each conversational phase
- Appropriate timing for timed_waiting phases
- Meaningful phase names and descriptions

## 💡 Best Practices

1. **Start Simple**: Begin with 3-5 phases, expand later
2. **Clear Transitions**: Make phase progression logical
3. **Meaningful Data**: Only collect data you'll use
4. **Appropriate Timing**:
   - Conversational: 2-10 minutes
   - Timed waiting: 30 seconds - 10 minutes
5. **User Experience**: Consider cognitive load and session flow
6. **Safety First**: Include grounding/stabilization phases when needed
7. **Flexibility**: Allow multiple transition paths where appropriate

## 🔧 Testing Your Workflow

Before submission, verify:
- [ ] All phases have unique IDs
- [ ] Transitions form a complete path
- [ ] Required data fields are clearly defined
- [ ] AI prompts provide clear guidance
- [ ] Timed phases have appropriate durations
- [ ] Total session time is reasonable (30-90 minutes)

## 📦 Delivery Package

Create a folder with:
```
workflow-name/
├── workflow.json          # Main workflow definition
├── prompts.md            # Detailed AI prompts for each phase
├── data-schema.json      # Complete data field definitions
├── README.md            # Overview and therapeutic rationale
└── examples/            # Sample session transcripts (optional)
```

## 🎯 Quick Start Example

Here's a minimal working workflow:

```json
{
  "workflow_name": "Quick Check-in",
  "phases": [
    {
      "id": "greeting",
      "display_name": "Welcome",
      "position": 1,
      "type": "conversational",
      "minimum_turns": 1,
      "required_data": [
        {"name": "name", "type": "string", "required": true}
      ]
    },
    {
      "id": "pause",
      "display_name": "Centering Pause",
      "position": 2,
      "type": "timed_waiting",
      "wait_duration_seconds": 30,
      "visualization_type": "breathing_circle"
    },
    {
      "id": "intention",
      "display_name": "Set Intention",
      "position": 3,
      "type": "conversational",
      "required_data": [
        {"name": "session_intention", "type": "string"}
      ]
    }
  ],
  "transitions": [
    {"from_phase": "greeting", "to_phase": "pause"},
    {"from_phase": "pause", "to_phase": "intention"}
  ]
}
```

---

Send completed workflows to: [Your Contact Info]
Questions? Include them in your README.md file!