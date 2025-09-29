# Workflow Navigation System - Creation Guide

## 🎯 Overview
Create custom AI-guided workflows for ANY domain - therapy, education, onboarding, coaching, sales, customer support, research interviews, and more. This system enables structured conversations with automatic progression, data collection, and interactive elements.

## 🏗️ System Architecture

Our system uses a **phase-based state machine** where:
- Each phase represents a distinct stage of your process
- Phases can be **conversational** (interactive dialogue) or **timed_waiting** (pauses, reflection, tasks)
- AI guide leads users through phases automatically
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

### 4. AI Guide Prompts
Configure the AI's behavior in each phase:

```json
{
  "phase_id": "phase_name",
  "prompt": "You are guiding the user through [phase description]. Focus on:\n- Key point 1\n- Key point 2\n\nAsk about: [specific topics]\nCollect: [required data]\nMaintain: [appropriate tone]"
}
```

## 🎨 Visualization Types for Timed Phases

- `breathing_circle` - Expanding/contracting circle for mindfulness
- `ocean_waves` - Calming wave animations
- `forest_sounds` - Nature-themed ambiance
- `mountain_view` - Scenic vista
- `starfield` - Space/stars animation
- `minimal` - Simple gradient background
- `progress_bar` - Task completion visual
- `countdown_timer` - Bold countdown display

## 📝 Complete Workflow Template

```json
{
  "workflow_name": "Your Workflow Name",
  "version": "1.0.0",
  "description": "Brief description of the process",
  "domain": "education/sales/support/coaching/therapy/onboarding",
  "total_duration_minutes": 30,

  "phases": [
    {
      "id": "introduction",
      "display_name": "Welcome",
      "description": "Introduce the process and set expectations",
      "position": 1,
      "type": "conversational",
      "minimum_turns": 2,
      "recommended_duration_seconds": 120,
      "icon": "HandWave",
      "color": "#4CAF50",
      "required_data": [
        {
          "name": "user_name",
          "type": "string",
          "required": true,
          "description": "User's preferred name"
        },
        {
          "name": "primary_goal",
          "type": "string",
          "required": true,
          "description": "What they hope to achieve"
        }
      ],
      "ai_prompt": "Warmly welcome the user and understand their primary goal."
    },

    {
      "id": "processing",
      "display_name": "Processing Time",
      "description": "Time for reflection or task completion",
      "position": 2,
      "type": "timed_waiting",
      "wait_duration_seconds": 60,
      "visualization_type": "progress_bar",
      "pre_wait_message": "Please take a moment to complete the following task...",
      "post_wait_prompt": "How did that go? What did you discover?",
      "icon": "Clock",
      "color": "#2196F3"
    }
  ],

  "transitions": [
    {
      "from_phase": "introduction",
      "to_phase": "processing",
      "condition": "user_name AND primary_goal collected"
    }
  ]
}
```

## 🌟 Domain-Specific Examples

### Example 1: Customer Onboarding
```json
{
  "workflow_name": "SaaS Product Onboarding",
  "domain": "onboarding",
  "phases": [
    {
      "id": "welcome",
      "display_name": "Welcome Aboard",
      "type": "conversational",
      "required_data": [
        {"name": "company_name", "type": "string"},
        {"name": "team_size", "type": "integer"},
        {"name": "use_case", "type": "string"}
      ]
    },
    {
      "id": "setup_pause",
      "display_name": "Account Setup",
      "type": "timed_waiting",
      "wait_duration_seconds": 120,
      "visualization_type": "progress_bar",
      "pre_wait_message": "Let's set up your workspace. Follow the steps on screen..."
    },
    {
      "id": "feature_tour",
      "display_name": "Key Features",
      "type": "conversational",
      "required_data": [
        {"name": "priority_features", "type": "array"},
        {"name": "integration_needs", "type": "array"}
      ]
    }
  ]
}
```

### Example 2: Sales Discovery Call
```json
{
  "workflow_name": "B2B Sales Discovery",
  "domain": "sales",
  "phases": [
    {
      "id": "rapport",
      "display_name": "Build Rapport",
      "type": "conversational",
      "minimum_turns": 2
    },
    {
      "id": "current_state",
      "display_name": "Current Situation",
      "type": "conversational",
      "required_data": [
        {"name": "current_solution", "type": "string"},
        {"name": "pain_points", "type": "array"},
        {"name": "budget_range", "type": "string"}
      ]
    },
    {
      "id": "demo_pause",
      "display_name": "Quick Demo",
      "type": "timed_waiting",
      "wait_duration_seconds": 180,
      "visualization_type": "minimal",
      "pre_wait_message": "Let me show you how our solution addresses your needs..."
    }
  ]
}
```

### Example 3: Educational Module
```json
{
  "workflow_name": "Learn Python Basics",
  "domain": "education",
  "phases": [
    {
      "id": "assess_knowledge",
      "display_name": "Knowledge Check",
      "type": "conversational",
      "required_data": [
        {"name": "programming_experience", "type": "string"},
        {"name": "learning_goals", "type": "array"}
      ]
    },
    {
      "id": "concept_introduction",
      "display_name": "Variables & Data Types",
      "type": "conversational",
      "minimum_turns": 4
    },
    {
      "id": "practice_time",
      "display_name": "Coding Exercise",
      "type": "timed_waiting",
      "wait_duration_seconds": 300,
      "visualization_type": "countdown_timer",
      "pre_wait_message": "Try writing a simple program using variables. You have 5 minutes!",
      "post_wait_prompt": "Share your code. What challenges did you face?"
    },
    {
      "id": "review",
      "display_name": "Review & Feedback",
      "type": "conversational",
      "required_data": [
        {"name": "code_submission", "type": "string"},
        {"name": "confidence_level", "type": "integer", "min": 1, "max": 5}
      ]
    }
  ]
}
```

### Example 4: Research Interview
```json
{
  "workflow_name": "User Research Interview",
  "domain": "research",
  "phases": [
    {
      "id": "consent",
      "display_name": "Consent & Introduction",
      "type": "conversational",
      "required_data": [
        {"name": "consent_given", "type": "boolean"},
        {"name": "demographic_info", "type": "object"}
      ]
    },
    {
      "id": "experience_mapping",
      "display_name": "Current Experience",
      "type": "conversational",
      "minimum_turns": 6,
      "required_data": [
        {"name": "current_workflow", "type": "string"},
        {"name": "pain_points", "type": "array"},
        {"name": "workarounds", "type": "array"}
      ]
    },
    {
      "id": "reflection",
      "display_name": "Reflection Break",
      "type": "timed_waiting",
      "wait_duration_seconds": 30,
      "visualization_type": "minimal",
      "pre_wait_message": "Take a moment to think about your ideal solution...",
      "post_wait_prompt": "Describe your ideal workflow."
    }
  ]
}
```

### Example 5: Fitness Coaching
```json
{
  "workflow_name": "Weekly Fitness Check-in",
  "domain": "coaching",
  "phases": [
    {
      "id": "progress_review",
      "display_name": "Weekly Progress",
      "type": "conversational",
      "required_data": [
        {"name": "workouts_completed", "type": "integer"},
        {"name": "nutrition_adherence", "type": "integer", "min": 1, "max": 10},
        {"name": "energy_levels", "type": "integer", "min": 1, "max": 10}
      ]
    },
    {
      "id": "movement_break",
      "display_name": "Quick Movement",
      "type": "timed_waiting",
      "wait_duration_seconds": 120,
      "visualization_type": "breathing_circle",
      "pre_wait_message": "Let's do 2 minutes of stretching. Follow along with your breath...",
      "post_wait_prompt": "How does your body feel now?"
    },
    {
      "id": "goal_setting",
      "display_name": "Next Week's Goals",
      "type": "conversational",
      "required_data": [
        {"name": "workout_goals", "type": "array"},
        {"name": "nutrition_goals", "type": "array"},
        {"name": "accountability_plan", "type": "string"}
      ]
    }
  ]
}
```

### Example 6: Technical Support
```json
{
  "workflow_name": "IT Support Troubleshooting",
  "domain": "support",
  "phases": [
    {
      "id": "issue_identification",
      "display_name": "Identify Issue",
      "type": "conversational",
      "required_data": [
        {"name": "device_type", "type": "string"},
        {"name": "issue_description", "type": "string"},
        {"name": "error_messages", "type": "array"},
        {"name": "when_started", "type": "string"}
      ]
    },
    {
      "id": "diagnostic_steps",
      "display_name": "Run Diagnostics",
      "type": "conversational",
      "minimum_turns": 3
    },
    {
      "id": "apply_fix",
      "display_name": "Apply Solution",
      "type": "timed_waiting",
      "wait_duration_seconds": 90,
      "visualization_type": "progress_bar",
      "pre_wait_message": "Please follow these steps to resolve the issue...",
      "post_wait_prompt": "Did that resolve your issue?"
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
8. **Field types** must be: string, integer, boolean, array, or object

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
   - Conversational: 1-10 minutes
   - Timed waiting: 30 seconds - 10 minutes
5. **User Experience**: Consider cognitive load and flow
6. **Progressive Disclosure**: Don't overwhelm users early
7. **Flexibility**: Allow multiple transition paths where appropriate
8. **Domain Appropriate**: Match tone and pacing to your use case

## 🔧 Testing Your Workflow

Before submission, verify:
- [ ] All phases have unique IDs
- [ ] Transitions form a complete path
- [ ] Required data fields are clearly defined
- [ ] AI prompts provide clear guidance
- [ ] Timed phases have appropriate durations
- [ ] Total time is reasonable for your domain

## 📦 Delivery Package

Create a folder with:
```
workflow-name/
├── workflow.json          # Main workflow definition
├── prompts.md            # Detailed AI prompts for each phase
├── data-schema.json      # Complete data field definitions
├── README.md            # Overview and business logic
└── examples/            # Sample conversations (optional)
```

## 🎯 Quick Start Template

Here's a minimal working workflow for ANY domain:

```json
{
  "workflow_name": "Quick Process",
  "domain": "general",
  "phases": [
    {
      "id": "start",
      "display_name": "Introduction",
      "position": 1,
      "type": "conversational",
      "minimum_turns": 1,
      "required_data": [
        {"name": "user_input", "type": "string", "required": true}
      ]
    },
    {
      "id": "process",
      "display_name": "Processing",
      "position": 2,
      "type": "timed_waiting",
      "wait_duration_seconds": 30,
      "visualization_type": "progress_bar"
    },
    {
      "id": "complete",
      "display_name": "Wrap Up",
      "position": 3,
      "type": "conversational",
      "required_data": [
        {"name": "feedback", "type": "string"}
      ]
    }
  ],
  "transitions": [
    {"from_phase": "start", "to_phase": "process"},
    {"from_phase": "process", "to_phase": "complete"}
  ]
}
```

---

Send completed workflows to: [Your Contact Info]
Questions? Include them in your README.md file!