/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Client } from './Client';
import type { SessionProgress } from './SessionProgress';
import type { Therapist } from './Therapist';

export type Session = {
    id?: string;
    client_id?: string;
    therapist_id?: string;
    status?: Session.status;
    start_time?: string;
    end_time?: string;
    current_stage?: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    client?: Client;
    therapist?: Therapist;
    progress?: Array<SessionProgress>;
};

export namespace Session {

    export enum status {
        SCHEDULED = 'scheduled',
        IN_PROGRESS = 'in_progress',
        COMPLETED = 'completed',
        CANCELLED = 'cancelled',
    }


}

