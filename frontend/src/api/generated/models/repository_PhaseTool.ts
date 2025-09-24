/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { repository_Phase } from './repository_Phase';
import type { repository_Tool } from './repository_Tool';

export type repository_PhaseTool = {
    id?: string;
    is_active?: boolean;
    /**
     * Relationships
     */
    phase?: repository_Phase;
    phase_id?: string;
    tool?: repository_Tool;
    tool_id?: string;
};

