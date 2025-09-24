/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Session } from './Session';
import type { Stage } from './Stage';

export type SessionProgress = {
    id?: string;
    session_id?: string;
    stage_id?: number;
    status?: SessionProgress.status;
    start_time?: string;
    end_time?: string;
    client_response?: string;
    therapist_notes?: string;
    stress_level?: number;
    created_at?: string;
    updated_at?: string;
    session?: Session;
    stage?: Stage;
};

export namespace SessionProgress {

    export enum status {
        PENDING = 'pending',
        IN_PROGRESS = 'in_progress',
        COMPLETED = 'completed',
        SKIPPED = 'skipped',
    }


}

