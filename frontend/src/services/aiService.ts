// Mock AI Service for Therapeutic Guidance
// This simulates integration with LLM APIs for real-time therapy guidance

interface TherapeuticContext {
  stage: number;
  clientResponse: string;
  stressLevel: number;
  therapistNotes: string;
  sessionDuration: number;
  previousStages: Array<{
    stage: number;
    outcome: "completed" | "skipped" | "struggled";
    notes: string;
  }>;
}

interface AIGuidance {
  id: string;
  type:
    | "suggestion"
    | "warning"
    | "encouragement"
    | "technique"
    | "question"
    | "adaptation";
  priority: "low" | "medium" | "high" | "urgent";
  content: string;
  context: string;
  confidence: number;
  timestamp: string;
  applicableStages?: number[];
  contraindications?: string[];
}

interface AdaptiveRecommendation {
  action: "continue" | "skip" | "repeat" | "modify" | "emergency";
  reason: string;
  modifications?: {
    stageDuration?: number;
    techniques?: string[];
    approach?: string;
  };
}

// Quan's 40 Years of Therapeutic Expertise - Encoded as Rules
const THERAPEUTIC_KNOWLEDGE_BASE = {
  // Stage-specific guidance patterns
  stagePatterns: {
    1: {
      // Background
      keyIndicators: ["rapport", "trust", "openness", "trauma_history"],
      techniques: [
        "active_listening",
        "validation",
        "pacing",
        "safety_building",
      ],
      redFlags: ["dissociation", "extreme_anxiety", "suicidal_ideation"],
      adaptations: {
        resistant_client: "slow_down_focus_on_safety",
        overwhelmed_client: "simplify_questions_provide_grounding",
        eager_client: "maintain_structure_prevent_rushing",
      },
    },
    2: {
      // Identify Issue
      keyIndicators: [
        "problem_clarity",
        "emotional_regulation",
        "insight_level",
      ],
      techniques: ["scaling", "externalization", "circular_questioning"],
      redFlags: ["rumination", "catastrophizing", "avoidance"],
      adaptations: {
        vague_problem: "use_concrete_examples_scaling",
        multiple_problems: "prioritize_most_pressing_issue",
        emotional_overwhelm: "return_to_grounding_slow_pace",
      },
    },
    3: {
      // Set Stage
      keyIndicators: ["readiness", "motivation", "therapeutic_alliance"],
      techniques: [
        "expectation_setting",
        "resource_identification",
        "containment",
      ],
      redFlags: [
        "ambivalence",
        "external_pressure",
        "unrealistic_expectations",
      ],
      adaptations: {
        not_ready: "more_psychoeducation_motivation_building",
        overly_eager: "temper_expectations_emphasize_process",
        fearful: "increase_safety_measures_go_slower",
      },
    },
    4: {
      // Meditation
      keyIndicators: [
        "relaxation_response",
        "present_moment_awareness",
        "body_awareness",
      ],
      techniques: [
        "breathing_exercises",
        "progressive_relaxation",
        "mindfulness",
      ],
      redFlags: ["dissociation", "panic_response", "religious_conflicts"],
      adaptations: {
        cant_relax: "try_movement_based_grounding",
        dissociates: "eyes_open_more_grounding",
        anxious_about_meditation: "reframe_as_simple_breathing",
      },
    },
    5: {
      // Processing
      keyIndicators: ["emotional_access", "insight_development", "catharsis"],
      techniques: [
        "emotional_regulation",
        "cognitive_restructuring",
        "somatic_awareness",
      ],
      redFlags: ["emotional_flooding", "retraumatization", "shutdown"],
      adaptations: {
        emotional_overwhelm: "immediate_grounding_resource_containment",
        stuck_emotions: "body_based_interventions_movement",
        intellectualizing: "focus_on_feelings_body_sensations",
      },
    },
    6: {
      // Integration
      keyIndicators: [
        "pattern_recognition",
        "meaning_making",
        "future_orientation",
      ],
      techniques: ["reflection", "metaphor_work", "narrative_therapy"],
      redFlags: ["premature_closure", "false_insights", "overwhelm"],
      adaptations: {
        cant_integrate: "simplify_focus_on_one_insight",
        false_positives: "gentle_questioning_reality_testing",
        overwhelmed_by_insights: "slow_down_prioritize_key_learning",
      },
    },
    7: {
      // Stabilization
      keyIndicators: ["emotional_stability", "grounding", "resource_access"],
      techniques: [
        "grounding_techniques",
        "resource_installation",
        "containment",
      ],
      redFlags: ["destabilization", "lingering_activation", "disconnection"],
      adaptations: {
        still_activated: "more_grounding_dont_rush_closure",
        disconnected: "gentle_reorientation_presence_building",
        resistant_to_closing: "validate_process_gentle_transition",
      },
    },
    8: {
      // Resolution
      keyIndicators: ["self_regulation", "empowerment", "hope", "integration"],
      techniques: ["resource_consolidation", "future_planning", "empowerment"],
      redFlags: ["premature_termination", "unresolved_issues", "dependency"],
      adaptations: {
        not_ready_to_end: "acknowledge_more_work_needed",
        overconfident: "reality_check_continued_support",
        dependent: "emphasize_client_strengths_autonomy",
      },
    },
  },

  // Cross-stage patterns
  globalPatterns: {
    trauma_informed: {
      triggers: ["trauma_history", "ptsd", "dissociation"],
      modifications: [
        "slower_pacing",
        "more_grounding",
        "safety_emphasis",
        "choice_giving",
      ],
    },
    attachment_aware: {
      triggers: [
        "abandonment_fears",
        "trust_issues",
        "interpersonal_difficulties",
      ],
      modifications: [
        "consistent_presence",
        "predictable_structure",
        "attuned_responses",
      ],
    },
    culturally_responsive: {
      triggers: [
        "cultural_background",
        "language_barriers",
        "religious_considerations",
      ],
      modifications: [
        "cultural_adaptation",
        "language_sensitivity",
        "family_system_awareness",
      ],
    },
  },
};

// Mock AI Service Class
export class TherapeuticAIService {
  private static instance: TherapeuticAIService;
  private guidanceHistory: AIGuidance[] = [];

  static getInstance(): TherapeuticAIService {
    if (!TherapeuticAIService.instance) {
      TherapeuticAIService.instance = new TherapeuticAIService();
    }
    return TherapeuticAIService.instance;
  }

  // Generate contextual guidance based on current therapeutic context
  async generateGuidance(context: TherapeuticContext): Promise<AIGuidance[]> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const guidance: AIGuidance[] = [];
    const stage = context.stage;
    const stageData =
      THERAPEUTIC_KNOWLEDGE_BASE.stagePatterns[
        stage as keyof typeof THERAPEUTIC_KNOWLEDGE_BASE.stagePatterns
      ];

    if (!stageData) return guidance;

    // Analyze stress level and generate appropriate guidance
    if (context.stressLevel > 7) {
      guidance.push({
        id: `stress-${Date.now()}`,
        type: "warning",
        priority: "high",
        content:
          "Client stress level is elevated. Consider slowing down and providing more grounding techniques.",
        context: `Stress level: ${context.stressLevel}/10`,
        confidence: 0.92,
        timestamp: new Date().toISOString(),
        contraindications: ["rushing", "intense_processing"],
      });
    }

    // Generate stage-specific guidance
    const stageGuidance = this.generateStageSpecificGuidance(
      context,
      stageData
    );
    guidance.push(...stageGuidance);

    // Generate adaptive recommendations
    const adaptive = this.generateAdaptiveGuidance(context);
    if (adaptive) guidance.push(adaptive);

    // Store guidance history
    this.guidanceHistory.push(...guidance);

    return guidance;
  }

  // Generate adaptive workflow recommendations
  async generateAdaptiveRecommendation(
    context: TherapeuticContext
  ): Promise<AdaptiveRecommendation> {
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    const stage = context.stage;
    const stressLevel = context.stressLevel;

    // Emergency situations
    if (
      stressLevel >= 9 ||
      context.clientResponse.toLowerCase().includes("suicide") ||
      context.clientResponse.toLowerCase().includes("harm")
    ) {
      return {
        action: "emergency",
        reason: "Client safety concern detected",
        modifications: {
          approach: "immediate_safety_protocol",
        },
      };
    }

    // High stress - recommend modifications
    if (stressLevel >= 7) {
      return {
        action: "modify",
        reason: "High stress level requires pacing adjustment",
        modifications: {
          stageDuration: Math.ceil(
            (THERAPEUTIC_KNOWLEDGE_BASE.stagePatterns[
              stage as keyof typeof THERAPEUTIC_KNOWLEDGE_BASE.stagePatterns
            ]?.techniques?.length || 3) * 1.5
          ),
          techniques: ["grounding", "breathing", "safety_building"],
          approach: "slower_pacing_more_support",
        },
      };
    }

    // Check for stage-specific adaptations
    const stageData =
      THERAPEUTIC_KNOWLEDGE_BASE.stagePatterns[
        stage as keyof typeof THERAPEUTIC_KNOWLEDGE_BASE.stagePatterns
      ];
    if (stageData) {
      // Analyze client response for adaptation triggers
      const clientResponse = context.clientResponse.toLowerCase();

      if (
        (stage === 2 && clientResponse.includes("confused")) ||
        clientResponse.includes("many problems")
      ) {
        return {
          action: "modify",
          reason: "Client needs help prioritizing issues",
          modifications: {
            techniques: ["scaling", "prioritization", "simplification"],
            approach: "break_down_complex_problems",
          },
        };
      }

      if (
        stage === 4 &&
        (clientResponse.includes("anxious") ||
          clientResponse.includes("scared"))
      ) {
        return {
          action: "modify",
          reason: "Client showing meditation anxiety",
          modifications: {
            techniques: ["eyes_open_meditation", "movement_based_grounding"],
            approach: "gentler_mindfulness_approach",
          },
        };
      }
    }

    // Default recommendation
    return {
      action: "continue",
      reason: "Client progressing well through current stage",
    };
  }

  // Generate mock physiological insights
  async generatePhysiologicalInsights(
    heartRate: number,
    _stressLevel: number
  ): Promise<AIGuidance[]> {
    const insights: AIGuidance[] = [];

    if (heartRate > 100) {
      insights.push({
        id: `physio-${Date.now()}`,
        type: "suggestion",
        priority: "medium",
        content:
          "Elevated heart rate detected. Consider implementing breathing exercises before proceeding.",
        context: `Heart rate: ${heartRate} BPM`,
        confidence: 0.88,
        timestamp: new Date().toISOString(),
        applicableStages: [3, 4, 7],
      });
    }

    return insights;
  }

  private generateStageSpecificGuidance(
    context: TherapeuticContext,
    _stageData: any
  ): AIGuidance[] {
    const guidance: AIGuidance[] = [];
    const stage = context.stage;

    // Stage 1: Background
    if (stage === 1) {
      if (context.clientResponse.length > 100) {
        guidance.push({
          id: `stage1-${Date.now()}`,
          type: "encouragement",
          priority: "medium",
          content:
            "Excellent rapport building. The client is sharing openly, which indicates good therapeutic alliance.",
          context: "Client showing good engagement",
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Stage 2: Identify Issue
    if (stage === 2) {
      guidance.push({
        id: `stage2-${Date.now()}`,
        type: "technique",
        priority: "high",
        content:
          'Consider using the scaling technique: "On a scale of 1-10, how much is this problem affecting your daily life?"',
        context: "Problem identification phase",
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      });
    }

    // Stage 4: Meditation
    if (stage === 4) {
      guidance.push({
        id: `stage4-${Date.now()}`,
        type: "suggestion",
        priority: "medium",
        content:
          "Start with a simple 5-minute breathing exercise. Watch for signs of dissociation or increased anxiety.",
        context: "Meditation preparation",
        confidence: 0.87,
        timestamp: new Date().toISOString(),
      });
    }

    // Stage 5: Processing
    if (stage === 5) {
      if (context.stressLevel > 6) {
        guidance.push({
          id: `stage5-${Date.now()}`,
          type: "warning",
          priority: "high",
          content:
            "Client is accessing difficult emotions. Stay present and be ready to provide grounding if needed.",
          context: "Emotional processing underway",
          confidence: 0.93,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return guidance;
  }

  private generateAdaptiveGuidance(
    context: TherapeuticContext
  ): AIGuidance | null {
    // Look for patterns that suggest adaptation needed
    const strugglingStages = context.previousStages.filter(
      (s) => s.outcome === "struggled"
    ).length;

    if (strugglingStages >= 2) {
      return {
        id: `adaptive-${Date.now()}`,
        type: "adaptation",
        priority: "high",
        content:
          "Pattern detected: Client may benefit from a modified approach. Consider adjusting pacing or technique selection.",
        context: `Struggling in ${strugglingStages} previous stages`,
        confidence: 0.89,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }

  // Get guidance history for analysis
  getGuidanceHistory(): AIGuidance[] {
    return this.guidanceHistory;
  }

  // Clear guidance history
  clearHistory(): void {
    this.guidanceHistory = [];
  }
}

// Export singleton instance
export const therapeuticAI = TherapeuticAIService.getInstance();
