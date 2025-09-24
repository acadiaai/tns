/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { repository_Phase } from './repository_Phase';

export type repository_PhaseConstraint = {
    /**
     * "blocking", "advisory", "warning"
     */
    behavior_type?: string;
    /**
     * "minimum_exchanges", "minimum_duration_seconds", "minimum_processing_time"
     */
    constraint_type?: string;
    created_at?: string;
    description?: string;
    id?: string;
    is_active?: boolean;
    /**
     * Relationships
     */
    phase?: repository_Phase;
    phase_id?: string;
    updated_at?: string;
    /**
     * The constraint value (e.g., 3 exchanges, 60 seconds)
     */
    value?: number;
};

