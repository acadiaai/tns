/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Session } from './Session';
import type { Stage } from './Stage';

export type AIGuidance = {
    id?: string;
    session_id?: string;
    stage_id?: number;
    type?: AIGuidance.type;
    content?: string;
    context?: string;
    confidence?: number;
    is_applied?: boolean;
    created_at?: string;
    session?: Session;
    stage?: Stage;
};

export namespace AIGuidance {

    export enum type {
        SUGGESTION = 'suggestion',
        WARNING = 'warning',
        ENCOURAGEMENT = 'encouragement',
        TECHNIQUE = 'technique',
        QUESTION = 'question',
    }


}

