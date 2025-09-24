/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { repository_PhaseTool } from './repository_PhaseTool';

export type repository_Tool = {
    created_at?: string;
    description?: string;
    handler_func?: string;
    id?: string;
    /**
     * JSON schema
     */
    input_schema?: string;
    is_active?: boolean;
    name?: string;
    /**
     * Relationships
     */
    phase_tools?: Array<repository_PhaseTool>;
    updated_at?: string;
    version?: number;
};

