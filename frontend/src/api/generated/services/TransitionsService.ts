/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_TransitionRequest } from '../models/api_TransitionRequest';
import type { repository_PhaseTransition } from '../models/repository_PhaseTransition';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class TransitionsService {

    /**
     * Get phase transitions
     * Retrieve all transitions FROM a specific phase
     * @param phaseId Phase ID
     * @returns repository_PhaseTransition OK
     * @throws ApiError
     */
    public static getApiPhasesTransitions(
        phaseId: string,
    ): CancelablePromise<Array<repository_PhaseTransition>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/phases/{phaseId}/transitions',
            path: {
                'phaseId': phaseId,
            },
        });
    }

    /**
     * Create phase transition
     * Create a new transition between phases
     * @param request Transition data
     * @returns repository_PhaseTransition Created
     * @throws ApiError
     */
    public static postApiTransitions(
        request: api_TransitionRequest,
    ): CancelablePromise<repository_PhaseTransition> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/transitions',
            body: request,
        });
    }

    /**
     * Update phase transition
     * Update an existing transition's condition or priority
     * @param id Transition ID
     * @param request Updated transition data
     * @returns repository_PhaseTransition OK
     * @throws ApiError
     */
    public static putApiTransitions(
        id: string,
        request: api_TransitionRequest,
    ): CancelablePromise<repository_PhaseTransition> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/transitions/{id}',
            path: {
                'id': id,
            },
            body: request,
        });
    }

    /**
     * Delete phase transition
     * Soft-delete a transition by setting is_active to false
     * @param id Transition ID
     * @returns void
     * @throws ApiError
     */
    public static deleteApiTransitions(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/transitions/{id}',
            path: {
                'id': id,
            },
        });
    }

}
