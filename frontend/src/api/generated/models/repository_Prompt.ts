/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type repository_Prompt = {
    /**
     * system, user, tool
     */
    category?: string;
    content?: string;
    created_at?: string;
    created_by?: string;
    description?: string;
    id?: string;
    is_active?: boolean;
    is_system?: boolean;
    name?: string;
    /**
     * JSON object for template vars
     */
    parameters?: string;
    updated_at?: string;
    updated_by?: string;
    usage_count?: number;
    /**
     * JSON array
     */
    variables?: string;
    version?: number;
    /**
     * Links to phases
     */
    workflow_phase?: string;
};

