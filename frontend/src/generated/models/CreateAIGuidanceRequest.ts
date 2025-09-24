/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CreateAIGuidanceRequest = {
    session_id: string;
    stage_id: number;
    type: CreateAIGuidanceRequest.type;
    content: string;
    context?: string;
    confidence?: number;
};

export namespace CreateAIGuidanceRequest {

    export enum type {
        SUGGESTION = 'suggestion',
        WARNING = 'warning',
        ENCOURAGEMENT = 'encouragement',
        TECHNIQUE = 'technique',
        QUESTION = 'question',
    }


}

