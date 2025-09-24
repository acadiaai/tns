/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { repository_PhaseConstraint } from './repository_PhaseConstraint';
import type { repository_PhaseData } from './repository_PhaseData';
import type { repository_PhaseTool } from './repository_PhaseTool';
import type { repository_PhaseTransition } from './repository_PhaseTransition';

export type api_PhaseResponse = {
    color?: string;
    created_at?: string;
    description?: string;
    display_name?: string;
    duration_seconds?: number;
    icon?: string;
    id?: string;
    /**
     * Required conversation exchanges
     */
    minimum_turns?: number;
    phase_constraints?: Array<repository_PhaseConstraint>;
    /**
     * Relationships
     */
    phase_data?: Array<repository_PhaseData>;
    phase_tools?: Array<repository_PhaseTool>;
    /**
     * Order of phases
     */
    position?: number;
    /**
     * Recommended time for phase
     */
    recommended_duration_seconds?: number;
    tools?: Array<string>;
    transitions?: Array<repository_PhaseTransition>;
    transitions_from?: Array<repository_PhaseTransition>;
    transitions_to?: Array<repository_PhaseTransition>;
    updated_at?: string;
};

