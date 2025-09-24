/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type UpdateSessionProgressRequest = {
    stage_id?: number;
    status: UpdateSessionProgressRequest.status;
    client_response?: string;
    therapist_notes?: string;
    stress_level?: number;
};

export namespace UpdateSessionProgressRequest {

    export enum status {
        PENDING = 'pending',
        IN_PROGRESS = 'in_progress',
        COMPLETED = 'completed',
        SKIPPED = 'skipped',
    }


}

