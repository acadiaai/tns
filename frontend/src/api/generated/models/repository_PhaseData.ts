/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { repository_Phase } from './repository_Phase';

export type repository_PhaseData = {
    created_at?: string;
    description?: string;
    id?: string;
    /**
     * e.g., "selected_issue", "suds_level"
     */
    name?: string;
    optional?: boolean;
    /**
     * Relationships
     */
    phase?: repository_Phase;
    phase_id?: string;
    required?: boolean;
    /**
     * JSON Schema for validation
     */
    schema?: string;
    updated_at?: string;
};

