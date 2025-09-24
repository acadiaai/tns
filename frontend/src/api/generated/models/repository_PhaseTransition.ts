/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { repository_Phase } from './repository_Phase';

export type repository_PhaseTransition = {
    /**
     * Optional condition for this transition
     */
    condition?: string;
    created_at?: string;
    /**
     * Relationships
     */
    from_phase?: repository_Phase;
    from_phase_id?: string;
    id?: string;
    is_active?: boolean;
    priority?: number;
    to_phase?: repository_Phase;
    to_phase_id?: string;
    updated_at?: string;
};

